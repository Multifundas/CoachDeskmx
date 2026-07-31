-- =============================================================================
-- 20260101007000_sede_tarifas.sql
-- Precio de coacheo por HORA por sede y tier (Base / Externa A / Externa B) y la
-- configuración de modificadores por franja horaria (matutino/nocturna) por sede.
-- Fuente del monto del cargo automático que genera marcar 'presente' en una clase.
-- RLS uniforme is_member(tenant_id), igual que las demás tablas con tenant_id.
-- =============================================================================

create type tier_sede as enum ('base', 'externa_a', 'externa_b');

-- Costo por hora por sede y tier.
create table sede_tarifas (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants (id) on delete cascade,
  sede_id     uuid not null references sedes (id) on delete cascade,
  tier        tier_sede not null,
  monto_hora  numeric(12,2) not null check (monto_hora >= 0),
  moneda      text not null default 'MXN',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, sede_id, tier)
);

comment on table sede_tarifas is
  'Costo de coacheo por hora por sede y tier. Fuente del monto del cargo de clase.';

-- Configuración por sede: tier por defecto y modificadores por franja horaria.
-- Los % son signo libre (negativo=descuento, positivo=recargo). Una hora local es
-- matutino (< matutino_hasta) XOR nocturna (>= nocturna_desde) XOR normal.
create table sede_config (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants (id) on delete cascade,
  sede_id        uuid not null references sedes (id) on delete cascade,
  tier_default   tier_sede not null default 'base',
  matutino_pct   numeric(6,2) not null default 0,
  nocturna_pct   numeric(6,2) not null default 0,
  matutino_hasta int not null default 12 check (matutino_hasta between 0 and 24),
  nocturna_desde int not null default 18 check (nocturna_desde between 0 and 24),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, sede_id)
);

comment on table sede_config is
  'Tier por defecto y modificadores matutino/nocturna (%) por sede.';

alter table sede_tarifas enable row level security;
alter table sede_tarifas force row level security;

create policy sede_tarifas_select on sede_tarifas
  for select using (app.is_member(tenant_id));
create policy sede_tarifas_insert on sede_tarifas
  for insert with check (app.is_member(tenant_id));
create policy sede_tarifas_update on sede_tarifas
  for update using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));
create policy sede_tarifas_delete on sede_tarifas
  for delete using (app.is_member(tenant_id));

alter table sede_config enable row level security;
alter table sede_config force row level security;

create policy sede_config_select on sede_config
  for select using (app.is_member(tenant_id));
create policy sede_config_insert on sede_config
  for insert with check (app.is_member(tenant_id));
create policy sede_config_update on sede_config
  for update using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));
create policy sede_config_delete on sede_config
  for delete using (app.is_member(tenant_id));

create index sede_tarifas_sede_idx on sede_tarifas (sede_id);
create index sede_config_sede_idx on sede_config (sede_id);
