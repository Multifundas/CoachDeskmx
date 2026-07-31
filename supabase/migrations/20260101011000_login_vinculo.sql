-- =============================================================================
-- 20260101011000_login_vinculo.sql
-- Vínculo login ↔ persona para dar acceso a las cuentas de TUTOR y ALUMNA.
--   * personas.app_user_id: liga a la alumna con su cuenta (app_users).
--   * tutores.app_user_id ya existe; se reutiliza para el tutor.
-- Y funciones auxiliares de RLS para distinguir COACH (maestra/coach_asistente)
-- de los roles familiares (tutor/alumna), y para resolver la persona a la que
-- cada uno tiene acceso.
-- =============================================================================

-- Cuenta de la alumna (opcional). Único parcial: una cuenta = a lo más una alumna.
alter table personas
  add column if not exists app_user_id uuid references app_users (id) on delete set null;

comment on column personas.app_user_id is
  'Cuenta (app_users) de la propia alumna, cuando la maestra la invita a entrar. NULL = sin login.';

create unique index if not exists personas_app_user_id_uidx
  on personas (app_user_id)
  where app_user_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers de RLS (SECURITY DEFINER para consultar sin recursión de RLS).
-- ---------------------------------------------------------------------------

-- ¿El usuario es COACH del tenant? (maestra o coach_asistente, o super_admin.)
-- Base para endurecer las políticas de tablas-tenant sin exponer el tenant a
-- las memberships de rol tutor/alumna.
create or replace function app.es_coach(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.is_super_admin()
    or app.has_role(p_tenant_id, 'maestra')
    or app.has_role(p_tenant_id, 'coach_asistente');
$$;

comment on function app.es_coach is
  'true si el usuario es maestra/coach_asistente del tenant (o super_admin). Excluye tutor/alumna.';

-- ¿La persona corresponde a la ALUMNA logueada? (su propia cuenta).
create or replace function app.persona_de_alumna(p_persona_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from personas p
    where p.id = p_persona_id
      and p.app_user_id = app.current_user_id()
  );
$$;

comment on function app.persona_de_alumna is
  'true si la persona es la propia alumna logueada (personas.app_user_id = usuario actual).';

-- ¿La persona es hija/pupila del TUTOR logueado? (vía persona_tutor → tutores).
create or replace function app.persona_de_tutor(p_persona_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from persona_tutor pt
    join tutores t on t.id = pt.tutor_id
    where pt.persona_id = p_persona_id
      and t.app_user_id = app.current_user_id()
  );
$$;

comment on function app.persona_de_tutor is
  'true si la persona está ligada a un tutor cuya cuenta es el usuario actual.';

-- ¿La persona pertenece a un tenant donde el usuario es COACH? (vía inscripción).
-- personas es identidad global sin tenant_id; el vínculo al tenant es la
-- inscripción. Un coach solo debe ver personas inscritas en SU tenant.
create or replace function app.persona_de_coach(p_persona_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select
    -- (a) La persona tiene inscripción en un tenant donde el usuario es coach.
    exists (
      select 1
      from inscripciones i
      where i.persona_id = p_persona_id
        and app.es_coach(i.tenant_id)
    )
    -- (b) Persona huérfana (aún sin inscripción) y el usuario es coach de algún
    --     tenant: cubre el instante entre crear la identidad y su inscripción
    --     en el alta de alumna. Sin esto, el INSERT ... RETURNING de la maestra
    --     no podría leer la fila recién creada.
    or (
      not exists (select 1 from inscripciones i2 where i2.persona_id = p_persona_id)
      and exists (
        select 1 from memberships m
        where m.app_user_id = app.current_user_id()
          and m.activo
          and m.rol in ('maestra', 'coach_asistente')
      )
    );
$$;

comment on function app.persona_de_coach is
  'true si la persona tiene inscripción en un tenant donde el usuario es coach, o si es una persona huérfana recién creada por un coach (alta de alumna).';

-- ¿El tutor (fila tutores) es visible para el usuario? Es visible si es su propia
-- cuenta, o si el usuario es coach de alguna persona ligada a ese tutor.
-- SECURITY DEFINER evita recursión de RLS entre tutores y persona_tutor.
create or replace function app.tutor_visible(p_tutor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select
    exists (
      select 1 from tutores t
      where t.id = p_tutor_id and t.app_user_id = app.current_user_id()
    )
    or exists (
      select 1
      from persona_tutor pt
      where pt.tutor_id = p_tutor_id
        and app.persona_de_coach(pt.persona_id)
    );
$$;

comment on function app.tutor_visible is
  'true si el tutor es la propia cuenta del usuario, o si el usuario es coach de alguna de sus pupilas. SECURITY DEFINER para evitar recursión de RLS.';

-- ¿El vínculo persona_tutor es visible para el usuario? Visible si el usuario es
-- coach de la persona, o si es el propio tutor de ese vínculo.
-- SECURITY DEFINER evita recursión de RLS.
create or replace function app.persona_tutor_visible(p_persona_id uuid, p_tutor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select
    app.persona_de_coach(p_persona_id)
    or exists (
      select 1 from tutores t
      where t.id = p_tutor_id and t.app_user_id = app.current_user_id()
    );
$$;

comment on function app.persona_tutor_visible is
  'true si el usuario es coach de la persona del vínculo o el propio tutor. SECURITY DEFINER para evitar recursión de RLS.';
