-- =============================================================================
-- 00_setup.sql — Fixtures compartidos para las pruebas pgTAP.
--
-- Crea dos tenants (Coach A, Coach B), un usuario por tenant y una inscripción
-- privada en cada uno. Estas funciones se usan desde las pruebas para simular
-- una sesión autenticada fijando request.jwt.claims con el sub del usuario.
--
-- Nota: pgTAP corre dentro de una transacción que se revierte al final de cada
-- archivo de prueba, así que estos INSERT no persisten entre archivos. Cada
-- archivo llama a app_test.montar_fixtures() en su plan.
-- =============================================================================

create schema if not exists app_test;

-- IDs deterministas para los fixtures.
create or replace function app_test.ids()
returns table (
  user_a uuid, user_b uuid,
  tenant_a uuid, tenant_b uuid,
  persona uuid,
  insc_a uuid, insc_b uuid
)
language sql immutable as $$
  select
    'aaaaaaaa-0000-4000-8000-00000000000a'::uuid,
    'bbbbbbbb-0000-4000-8000-00000000000b'::uuid,
    'aaaaaaaa-1111-4000-8000-00000000000a'::uuid,
    'bbbbbbbb-1111-4000-8000-00000000000b'::uuid,
    'cccccccc-2222-4000-8000-00000000000c'::uuid,
    'aaaaaaaa-3333-4000-8000-00000000000a'::uuid,
    'bbbbbbbb-3333-4000-8000-00000000000b'::uuid;
$$;

-- Simula una sesión autenticada como el usuario dado (rol authenticated).
create or replace function app_test.actuar_como(p_user uuid)
returns void
language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text,
    true  -- local: solo dura la transacción
  );
  -- Cambiar a un rol NO privilegiado para que RLS aplique.
  set local role authenticated;
end;
$$;

-- Vuelve al rol propietario (postgres) para operaciones de setup sin RLS.
create or replace function app_test.actuar_como_owner()
returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Monta los fixtures base (como owner, sin RLS).
create or replace function app_test.montar_fixtures()
returns void
language plpgsql as $$
declare r record;
begin
  select * into r from app_test.ids();

  -- auth.users mínimos (Supabase local ya tiene el esquema auth).
  insert into auth.users (id, email)
  values (r.user_a, 'coach_a@test.mx'), (r.user_b, 'coach_b@test.mx')
  on conflict (id) do nothing;

  insert into app_users (id, nombre, email)
  values (r.user_a, 'Coach A', 'coach_a@test.mx'),
         (r.user_b, 'Coach B', 'coach_b@test.mx')
  on conflict (id) do nothing;

  insert into tenants (id, nombre, slug)
  values (r.tenant_a, 'Coach A', 'coach-a'),
         (r.tenant_b, 'Coach B', 'coach-b')
  on conflict (id) do nothing;

  insert into memberships (tenant_id, app_user_id, rol)
  values (r.tenant_a, r.user_a, 'maestra'),
         (r.tenant_b, r.user_b, 'maestra')
  on conflict do nothing;

  -- Una persona global inscrita con AMBAS maestras (mismo identidad).
  insert into personas (id, nombre, apellidos)
  values (r.persona, 'Ana', 'Pérez')
  on conflict (id) do nothing;

  insert into inscripciones (id, tenant_id, persona_id, notas_privadas)
  values (r.insc_a, r.tenant_a, r.persona, 'Nota PRIVADA de Coach A'),
         (r.insc_b, r.tenant_b, r.persona, 'Nota PRIVADA de Coach B')
  on conflict (id) do nothing;
end;
$$;
