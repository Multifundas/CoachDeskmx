-- =============================================================================
-- 20260101000500_sedes_bloques.sql
-- Sedes (pistas de hielo) y bloques de hielo comprados por la maestra.
-- La zona horaria vive en la sede: se almacena UTC y se resuelve contra ella.
-- =============================================================================

create table sedes (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id) on delete cascade,
  nombre       text not null,
  timezone     text not null default 'America/Mexico_City',
  direccion    text,
  activa       boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table sedes is 'Pista de hielo. Su timezone gobierna la resolución de horarios.';

-- Bloques de hielo: franjas contratadas. Pueden ser recurrentes por día de
-- semana o de fecha específica.
create table bloques_hielo (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants (id) on delete cascade,
  sede_id       uuid not null references sedes (id) on delete cascade,
  dia_semana    int check (dia_semana between 0 and 6),  -- 0=domingo; null si es por fecha
  fecha         date,                                     -- para bloques puntuales
  hora_inicio   time not null,
  hora_fin      time not null,
  capacidad     int check (capacidad >= 0),
  created_at    timestamptz not null default now(),
  check (dia_semana is not null or fecha is not null),
  check (hora_fin > hora_inicio)
);

comment on table bloques_hielo is 'Franjas de hielo contratadas (recurrentes o puntuales).';

create index sedes_tenant_idx on sedes (tenant_id);
create index bloques_hielo_sede_idx on bloques_hielo (sede_id);
