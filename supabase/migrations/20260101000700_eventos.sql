-- =============================================================================
-- 20260101000700_eventos.sql
-- Eventos (clases), recurrencia (RRULE), ocurrencias materializadas y asistencia.
-- UID/SEQ estables para feed ICS con STATUS:CANCELLED.
-- Todo instante se almacena en UTC.
-- =============================================================================

create type tipo_evento as enum ('clase', 'competencia', 'examen', 'evento', 'otro');
create type estado_evento as enum ('activo', 'cancelado');

create table eventos (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id) on delete cascade,
  sede_id      uuid references sedes (id) on delete set null,
  tipo         tipo_evento not null default 'clase',
  titulo       text not null,
  inicio_utc   timestamptz not null,
  fin_utc      timestamptz not null,
  rrule        text,                  -- iCalendar RRULE (null = evento único)
  uid          citext not null unique, -- UID estable para ICS
  seq          int not null default 0, -- SEQUENCE ICS (incrementa al editar)
  estado       estado_evento not null default 'activo',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (fin_utc > inicio_utc)
);

comment on table eventos is 'Clase/evento con recurrencia opcional (RRULE) y UID estable ICS.';
comment on column eventos.uid is 'UID estable para el feed ICS; no cambia al editar.';
comment on column eventos.seq is 'SEQUENCE ICS; se incrementa en cada modificación.';

-- Ocurrencias materializadas de la RRULE (o la única del evento).
create table evento_ocurrencias (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id) on delete cascade,
  evento_id    uuid not null references eventos (id) on delete cascade,
  inicio_utc   timestamptz not null,
  fin_utc      timestamptz not null,
  estado       estado_evento not null default 'activo',
  created_at   timestamptz not null default now(),
  check (fin_utc > inicio_utc),
  unique (evento_id, inicio_utc)
);

comment on table evento_ocurrencias is 'Instancia concreta de un evento (materializada de RRULE).';

create type estado_asistencia as enum ('presente', 'ausente', 'justificada', 'sin_marcar');

create table asistencias (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants (id) on delete cascade,
  ocurrencia_id     uuid not null references evento_ocurrencias (id) on delete cascade,
  inscripcion_id    uuid not null references inscripciones (id) on delete cascade,
  estado            estado_asistencia not null default 'sin_marcar',
  marcado_at_utc    timestamptz,
  created_at        timestamptz not null default now(),
  unique (ocurrencia_id, inscripcion_id)
);

comment on table asistencias is 'Asistencia de una alumna a una ocurrencia concreta.';

create index eventos_tenant_idx on eventos (tenant_id, inicio_utc);
create index ocurrencias_evento_idx on evento_ocurrencias (evento_id, inicio_utc);
create index asistencias_ocurrencia_idx on asistencias (ocurrencia_id);
