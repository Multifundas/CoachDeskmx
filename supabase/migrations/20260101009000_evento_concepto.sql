-- =============================================================================
-- 20260101009000_evento_concepto.sql
-- Concepto opcional de referencia para un evento/clase. Es informativo: NO
-- cambia el cálculo automático del cargo de clase (que sigue resolviendo el
-- costo por hora + modificadores por clave). Sirve para que la maestra etiquete
-- una clase/evento con el concepto de "Conceptos y precios" al programarlo.
-- =============================================================================

alter table eventos
  add column if not exists concepto_id uuid references conceptos (id) on delete set null;

comment on column eventos.concepto_id is
  'Concepto de referencia (opcional) elegido al programar el evento. Informativo; no altera el cargo automático de clase.';

create index if not exists eventos_concepto_idx on eventos (concepto_id);
