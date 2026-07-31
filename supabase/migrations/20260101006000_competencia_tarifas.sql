-- =============================================================================
-- 20260101006000_competencia_tarifas.sql
-- Cuota de coacheo de competencia POR NIVEL, configurable por maestra (tenant).
-- El esquema base (conceptos_precios) versiona precio a nivel de concepto, no por
-- nivel; esta tabla añade la tabla de precios por nivel que pide el flujo de
-- inscripción a competencias (monto del cargo generado según el nivel de la alumna).
-- RLS uniforme is_member(tenant_id), igual que las demás tablas con tenant_id.
-- =============================================================================

create table competencia_tarifas_nivel (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants (id) on delete cascade,
  nivel_id    uuid not null references niveles (id) on delete cascade,
  monto       numeric(12,2) not null check (monto >= 0),
  moneda      text not null default 'MXN',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, nivel_id)
);

comment on table competencia_tarifas_nivel is
  'Cuota de coacheo de competencia por nivel (por tenant). Fuente del monto del cargo al inscribir una alumna.';

alter table competencia_tarifas_nivel enable row level security;
alter table competencia_tarifas_nivel force row level security;

create policy competencia_tarifas_nivel_select on competencia_tarifas_nivel
  for select using (app.is_member(tenant_id));
create policy competencia_tarifas_nivel_insert on competencia_tarifas_nivel
  for insert with check (app.is_member(tenant_id));
create policy competencia_tarifas_nivel_update on competencia_tarifas_nivel
  for update using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));
create policy competencia_tarifas_nivel_delete on competencia_tarifas_nivel
  for delete using (app.is_member(tenant_id));

create index competencia_tarifas_nivel_tenant_idx
  on competencia_tarifas_nivel (tenant_id);
