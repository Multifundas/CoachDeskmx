-- =============================================================================
-- 20260101000600_conceptos_precios.sql
-- Conceptos cobrables por maestra y sus precios versionados.
-- =============================================================================

create type tipo_concepto as enum (
  'clase', 'inscripcion', 'competencia', 'examen', 'material', 'otro'
);

create table conceptos (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id) on delete cascade,
  clave        text not null,
  nombre       text not null,
  tipo         tipo_concepto not null default 'clase',
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (tenant_id, clave)
);

comment on table conceptos is 'Conceptos cobrables por maestra (clases, inscripción, etc.).';

-- Precios versionados: histórico intacto vía rangos de vigencia.
create table conceptos_precios (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants (id) on delete cascade,
  concepto_id     uuid not null references conceptos (id) on delete cascade,
  monto           numeric(12,2) not null check (monto >= 0),
  moneda          text not null default 'MXN',
  vigencia_desde  date not null default current_date,
  vigencia_hasta  date,
  created_at      timestamptz not null default now(),
  check (vigencia_hasta is null or vigencia_hasta >= vigencia_desde)
);

comment on table conceptos_precios is 'Precio de un concepto con rango de vigencia (versionado).';

-- FK diferida desde inscripcion_tarifas hacia conceptos.
alter table inscripcion_tarifas
  add constraint inscripcion_tarifas_concepto_fk
  foreign key (concepto_id) references conceptos (id) on delete restrict;

create index conceptos_tenant_idx on conceptos (tenant_id);
create index conceptos_precios_concepto_idx on conceptos_precios (concepto_id, vigencia_desde);
