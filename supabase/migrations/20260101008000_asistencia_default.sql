-- =============================================================================
-- 20260101008000_asistencia_default.sql
-- Ajuste a nivel tenant: modo de asistencia por defecto.
--   'sin_marcar' -> comportamiento actual: la maestra confirma cada alumna.
--   'presente'   -> pre-selecciona presente; la maestra solo marca excepciones
--                   y materializa los cargos con "Marcar todas presentes".
-- =============================================================================

alter table tenants
  add column asistencia_default text not null default 'sin_marcar'
  constraint tenants_asistencia_default_chk
  check (asistencia_default in ('sin_marcar', 'presente'));

comment on column tenants.asistencia_default is
  'Modo de asistencia por defecto de la agenda (sin_marcar | presente).';

-- La maestra necesita poder actualizar su propio tenant (SELECT ya cubierto por
-- tenants_select vía is_member). super_admin ya cubierto por tenants_all.
create policy tenants_maestra_update on tenants
  for update using (app.has_role(id, 'maestra'))
  with check (app.has_role(id, 'maestra'));
