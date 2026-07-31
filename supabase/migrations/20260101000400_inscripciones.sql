-- =============================================================================
-- 20260101000400_inscripciones.sql
-- Capa de INSCRIPCIÓN (POR tenant). Aquí vive TODO lo privado de la maestra:
-- notas, tarifas, cargos, pagos. RLS crítico: Coach A jamás ve lo de Coach B.
-- =============================================================================

create type estado_inscripcion as enum ('activa', 'pausada', 'baja');

-- Inscripción de una persona con una maestra específica.
create table inscripciones (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants (id) on delete cascade,
  persona_id       uuid not null references personas (id) on delete restrict,
  estado           estado_inscripcion not null default 'activa',
  fecha_alta       date not null default current_date,
  fecha_baja       date,
  notas_privadas   text,          -- PRIVADO por maestra
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Una persona no puede estar inscrita dos veces con la misma maestra.
  unique (tenant_id, persona_id)
);

comment on table inscripciones is
  'Relación persona↔maestra. Contiene datos privados; aislado por RLS.';
comment on column inscripciones.notas_privadas is
  'Notas privadas de la maestra. NUNCA visibles a otra maestra.';

-- Tarifas por alumna, privadas por tenant y versionadas por vigencia.
create table inscripcion_tarifas (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants (id) on delete cascade,
  inscripcion_id  uuid not null references inscripciones (id) on delete cascade,
  concepto_id     uuid not null,        -- FK a conceptos (migración posterior)
  monto           numeric(12,2) not null check (monto >= 0),
  moneda          text not null default 'MXN',
  vigencia_desde  date not null default current_date,
  vigencia_hasta  date,
  created_at      timestamptz not null default now()
);

comment on table inscripcion_tarifas is
  'Tarifa privada por alumna/maestra. Reputación crítica: aislada por RLS.';

create index inscripciones_tenant_idx on inscripciones (tenant_id);
create index inscripciones_persona_idx on inscripciones (persona_id);
create index inscripcion_tarifas_insc_idx on inscripcion_tarifas (inscripcion_id);
