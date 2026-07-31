-- =============================================================================
-- 20260101010100_desempeno.sql
-- Desempeño de la alumna: seguimiento del "camino al próximo nivel" (estado de
-- cada elemento oficial del examen) y "tareas para la mamá" (checklist). Ambas
-- tablas son por tenant (privadas de cada maestra) y con RLS de aislamiento.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_elemento') then
    create type estado_elemento as enum ('pendiente', 'en_progreso', 'dominado');
  end if;
end;
$$;

-- Estado de cada elemento del examen del próximo nivel para una alumna.
-- Se rastrea por elemento_id (catálogo global) para que el registro sobreviva
-- cuando la alumna avanza de nivel.
create table if not exists desempeno_elementos (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants (id) on delete cascade,
  inscripcion_id uuid not null references inscripciones (id) on delete cascade,
  elemento_id    uuid not null references elementos_examen (id) on delete cascade,
  estado         estado_elemento not null default 'pendiente',
  nota           text,
  updated_at     timestamptz not null default now(),
  unique (inscripcion_id, elemento_id)
);

comment on table desempeno_elementos is
  'Estado (pendiente/en_progreso/dominado) de cada elemento oficial del examen para una alumna. Privado por tenant.';

create index if not exists desempeno_elementos_inscripcion_idx
  on desempeno_elementos (inscripcion_id);

-- Checklist que la maestra crea para la mamá (título + fecha límite opcional).
create table if not exists tareas_alumna (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants (id) on delete cascade,
  inscripcion_id uuid not null references inscripciones (id) on delete cascade,
  titulo         text not null,
  fecha_limite   date,
  hecha          boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table tareas_alumna is
  'Tareas (checklist) que la maestra deja a la mamá de la alumna. Privado por tenant.';

create index if not exists tareas_alumna_inscripcion_idx
  on tareas_alumna (inscripcion_id);

-- ============================ RLS (aislamiento por tenant) =================
-- Mismo patrón que 20260101002100_rls_policies.sql para tablas con tenant_id.
do $$
declare t text;
begin
  foreach t in array array['desempeno_elementos', 'tareas_alumna']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('alter table %I force row level security;', t);
    execute format('drop policy if exists %I on %I;', t || '_select', t);
    execute format(
      'create policy %I on %I for select using (app.is_member(tenant_id));',
      t || '_select', t);
    execute format('drop policy if exists %I on %I;', t || '_insert', t);
    execute format(
      'create policy %I on %I for insert with check (app.is_member(tenant_id));',
      t || '_insert', t);
    execute format('drop policy if exists %I on %I;', t || '_update', t);
    execute format(
      'create policy %I on %I for update using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));',
      t || '_update', t);
    execute format('drop policy if exists %I on %I;', t || '_delete', t);
    execute format(
      'create policy %I on %I for delete using (app.is_member(tenant_id));',
      t || '_delete', t);
  end loop;
end;
$$;
