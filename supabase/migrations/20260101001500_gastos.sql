-- =============================================================================
-- 20260101001500_gastos.sql
-- Gastos de la maestra (control de negocio propio).
-- =============================================================================

create type categoria_gasto as enum (
  'hielo', 'competencia', 'material', 'transporte', 'capacitacion', 'otro'
);

create table gastos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants (id) on delete cascade,
  concepto        text not null,
  monto           numeric(12,2) not null check (monto >= 0),
  moneda          text not null default 'MXN',
  fecha           date not null default current_date,
  categoria       categoria_gasto not null default 'otro',
  comprobante_url text,
  created_at      timestamptz not null default now()
);

comment on table gastos is 'Gasto operativo de la maestra (hielo, competencias, etc.).';

create index gastos_tenant_idx on gastos (tenant_id, fecha);
