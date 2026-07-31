-- =============================================================================
-- 20260101000800_cancelacion.sql
-- Motor de políticas de cancelación. La decisión se SELLA con timestamp de
-- servidor y un snapshot jsonb de la política vigente al momento.
-- =============================================================================

create type resultado_cancelacion as enum ('sin_cargo', 'con_cargo', 'credito');

-- Política configurable por maestra.
create table politicas_cancelacion (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants (id) on delete cascade,
  nombre            text not null,
  ventana_horas     int not null check (ventana_horas >= 0), -- aviso mínimo sin cargo
  cargo_pct         numeric(5,2) not null default 0 check (cargo_pct between 0 and 100),
  genera_credito    boolean not null default false,
  activa            boolean not null default true,
  created_at        timestamptz not null default now()
);

comment on table politicas_cancelacion is
  'Política de cancelación por maestra (ventana de aviso y % de cargo).';

-- Cancelación sellada: el snapshot congela la regla aplicada.
create table cancelaciones (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants (id) on delete cascade,
  ocurrencia_id       uuid not null references evento_ocurrencias (id) on delete cascade,
  inscripcion_id      uuid not null references inscripciones (id) on delete cascade,
  politica_id         uuid references politicas_cancelacion (id) on delete set null,
  solicitado_at_utc   timestamptz not null default now(),  -- sellado por servidor
  politica_snapshot   jsonb not null,                       -- regla congelada
  resultado           resultado_cancelacion not null,
  created_at          timestamptz not null default now(),
  unique (ocurrencia_id, inscripcion_id)
);

comment on column cancelaciones.solicitado_at_utc is
  'Instante sellado por el servidor; base para calcular la ventana.';
comment on column cancelaciones.politica_snapshot is
  'Snapshot jsonb de la política al momento de cancelar (auditable).';

create index politicas_cancelacion_tenant_idx on politicas_cancelacion (tenant_id) where activa;
create index cancelaciones_tenant_idx on cancelaciones (tenant_id);
