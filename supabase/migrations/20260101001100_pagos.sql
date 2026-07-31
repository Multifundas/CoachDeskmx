-- =============================================================================
-- 20260101001100_pagos.sql
-- Pagos de la alumna y su aplicación a cargos.
-- =============================================================================

create type metodo_pago as enum ('efectivo', 'transferencia', 'tarjeta', 'otro');

create table pagos (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants (id) on delete cascade,
  inscripcion_id   uuid not null references inscripciones (id) on delete restrict,
  monto            numeric(12,2) not null check (monto > 0),
  moneda           text not null default 'MXN',
  metodo           metodo_pago not null default 'transferencia',
  referencia       text,
  pagado_at_utc    timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

comment on table pagos is 'Pago recibido de una alumna. El servidor siempre gana en conflictos.';

create table pagos_aplicaciones (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id) on delete cascade,
  pago_id      uuid not null references pagos (id) on delete cascade,
  cargo_id     uuid not null references cargos (id) on delete cascade,
  monto        numeric(12,2) not null check (monto > 0),
  created_at   timestamptz not null default now(),
  unique (pago_id, cargo_id)
);

comment on table pagos_aplicaciones is 'Aplicación de un pago a un cargo específico.';

create index pagos_insc_idx on pagos (inscripcion_id, pagado_at_utc);
create index pagos_aplicaciones_pago_idx on pagos_aplicaciones (pago_id);
create index pagos_aplicaciones_cargo_idx on pagos_aplicaciones (cargo_id);
