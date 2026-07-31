-- =============================================================================
-- 20260101001000_facturacion.sql
-- Cargos y estados de cuenta. El corte (estado_cuenta) es INMUTABLE tras
-- sellarse: un trigger impide UPDATE/DELETE de filas selladas.
-- =============================================================================

create type origen_cargo as enum ('clase', 'cancelacion', 'inscripcion', 'competencia', 'manual');
create type estado_cargo as enum ('pendiente', 'pagado', 'parcial', 'cancelado', 'en_corte');

create table cargos (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants (id) on delete cascade,
  inscripcion_id   uuid not null references inscripciones (id) on delete cascade,
  concepto_id      uuid references conceptos (id) on delete set null,
  monto            numeric(12,2) not null check (monto >= 0),
  moneda           text not null default 'MXN',
  periodo          text,                 -- 'YYYY-MM' cuando aplica
  origen           origen_cargo not null default 'clase',
  estado           estado_cargo not null default 'pendiente',
  estado_cuenta_id uuid,                 -- FK diferida al estado de cuenta que lo congela
  created_at       timestamptz not null default now()
);

comment on table cargos is 'Cargo generado a una alumna (clase, cancelación, etc.).';

-- FK diferida desde creditos_consumos hacia cargos.
alter table creditos_consumos
  add constraint creditos_consumos_cargo_fk
  foreign key (cargo_id) references cargos (id) on delete cascade;

-- Estado de cuenta: corte congelado con folio único e inmutable.
create table estados_cuenta (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants (id) on delete cascade,
  inscripcion_id   uuid not null references inscripciones (id) on delete restrict,
  folio            text not null,
  periodo          text not null,        -- 'YYYY-MM'
  total            numeric(12,2) not null check (total >= 0),
  snapshot         jsonb not null,        -- detalle congelado de cargos/pagos
  sellado_at_utc   timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (tenant_id, folio)
);

comment on table estados_cuenta is
  'Corte congelado con folio. Inmutable tras sellarse (trigger).';

-- FK diferida desde cargos hacia estados_cuenta.
alter table cargos
  add constraint cargos_estado_cuenta_fk
  foreign key (estado_cuenta_id) references estados_cuenta (id) on delete set null;

-- Trigger de inmutabilidad: una vez insertado un estado_cuenta, no se puede
-- actualizar ni borrar (el corte es definitivo y auditable).
create or replace function app.impedir_mutacion_estado_cuenta()
returns trigger
language plpgsql
as $$
begin
  raise exception 'estados_cuenta es inmutable: no se permite % sobre folio %',
    tg_op, coalesce(old.folio, '(desconocido)');
  return null;
end;
$$;

create trigger estados_cuenta_no_update
  before update on estados_cuenta
  for each row execute function app.impedir_mutacion_estado_cuenta();

create trigger estados_cuenta_no_delete
  before delete on estados_cuenta
  for each row execute function app.impedir_mutacion_estado_cuenta();

create index cargos_insc_idx on cargos (inscripcion_id, created_at);
create index cargos_tenant_estado_idx on cargos (tenant_id, estado);
create index estados_cuenta_insc_idx on estados_cuenta (inscripcion_id, periodo);
