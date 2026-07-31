-- =============================================================================
-- 20260101000900_creditos.sql
-- Créditos a favor de la alumna, consumidos FIFO y con expiración.
-- =============================================================================

create type origen_credito as enum ('cancelacion', 'ajuste', 'promocion', 'saldo_a_favor');

create table creditos (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants (id) on delete cascade,
  inscripcion_id    uuid not null references inscripciones (id) on delete cascade,
  monto_original    numeric(12,2) not null check (monto_original > 0),
  saldo             numeric(12,2) not null check (saldo >= 0),
  origen            origen_credito not null,
  vence_at_utc      timestamptz,          -- null = sin expiración
  creado_at_utc     timestamptz not null default now(),
  check (saldo <= monto_original)
);

comment on table creditos is 'Crédito a favor de la alumna; se consume FIFO por antigüedad.';

-- Consumos del crédito contra cargos (FK a cargos en migración posterior).
create table creditos_consumos (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants (id) on delete cascade,
  credito_id        uuid not null references creditos (id) on delete cascade,
  cargo_id          uuid not null,       -- FK a cargos (diferida)
  monto             numeric(12,2) not null check (monto > 0),
  consumido_at_utc  timestamptz not null default now()
);

comment on table creditos_consumos is 'Aplicación de crédito a un cargo (parte del FIFO).';

create index creditos_insc_idx on creditos (inscripcion_id, creado_at_utc)
  where saldo > 0;
create index creditos_consumos_credito_idx on creditos_consumos (credito_id);
