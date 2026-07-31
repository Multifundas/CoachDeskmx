-- =============================================================================
-- 20260101001400_competencias.sql
-- Competencias y las inscripciones de alumnas a ellas.
-- =============================================================================

create table competencias (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants (id) on delete cascade,
  temporada_id   uuid references temporadas (id) on delete set null,
  nombre         text not null,
  sede           text,
  fecha          date,
  created_at     timestamptz not null default now()
);

comment on table competencias is 'Competencia registrada por la maestra.';

create table competencia_inscripciones (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants (id) on delete cascade,
  competencia_id    uuid not null references competencias (id) on delete cascade,
  inscripcion_id    uuid not null references inscripciones (id) on delete cascade,
  nivel_id          uuid references niveles (id) on delete set null,
  categoria         text,
  created_at        timestamptz not null default now(),
  unique (competencia_id, inscripcion_id)
);

comment on table competencia_inscripciones is 'Alumna inscrita a una competencia con nivel/categoría.';

create index competencias_tenant_idx on competencias (tenant_id, fecha);
create index competencia_inscripciones_comp_idx on competencia_inscripciones (competencia_id);
