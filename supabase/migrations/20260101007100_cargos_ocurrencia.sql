-- =============================================================================
-- 20260101007100_cargos_ocurrencia.sql
-- Liga el cargo automático de clase a la ocurrencia que lo generó, para
-- idempotencia: marcar 'presente' crea/reactiva a lo más UN cargo de clase por
-- (ocurrencia, alumna); des-marcar lo cancela. El índice parcial no afecta a
-- cargos manuales/inscripcion/competencia (ocurrencia_id null).
-- =============================================================================

alter table cargos
  add column ocurrencia_id uuid references evento_ocurrencias (id) on delete set null;

comment on column cargos.ocurrencia_id is
  'Ocurrencia de clase que generó este cargo automático (origen=clase). Null en cargos manuales.';

create unique index cargos_clase_ocurrencia_uq
  on cargos (ocurrencia_id, inscripcion_id)
  where origen = 'clase' and ocurrencia_id is not null;

create index cargos_ocurrencia_idx on cargos (ocurrencia_id);
