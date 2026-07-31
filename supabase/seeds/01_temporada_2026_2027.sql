-- =============================================================================
-- 01_temporada_2026_2027.sql
-- Temporada federativa 2026/2027 (1-jul-2026 a 30-jun-2027).
--
-- vigencia_reglas = 2026-07-01 según el cuerpo del reglamento (p.38, resaltado):
-- "Estas reglas ENTRAN EN VIGOR a partir del 1 de JULIO de 2026".
-- Los encabezados de pp.38-50 dicen "2025"; se documenta en PENDIENTES.md.
-- El campo es configurable: NO se hardcodea en lógica.
-- =============================================================================

insert into temporadas (id, nombre, fecha_inicio, fecha_fin, vigencia_reglas, activa)
values (
  '26262627-0000-4000-8000-000000002627',
  '2026/2027',
  date '2026-07-01',
  date '2027-06-30',
  date '2026-07-01',
  true
)
on conflict (nombre) do nothing;
