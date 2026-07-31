-- =============================================================================
-- 06_reglas_permanencia.sql
-- Regla de permanencia §6.5 del PDF (p.38). Vigencia efectiva: 1-jul-2026
-- (cuerpo del reglamento). Ver PENDIENTES.md por la discrepancia 2025/2026.
--
-- Resumen de la regla:
--   * Debutantes 1 + Debutantes 2: máx 1 temporada COMBINADO (grupo 'debutantes').
--   * Pre-Básicos: máx 1 temporada.  Básicos: máx 1 temporada (cada uno).
--   * Excepción Pre-Infantil: puede permanecer 1 temporada por nivel en Debutantes.
--   * NO aplica a categoría Especial.
--   * Adulto dentro de Debutantes 1 a Pre-Básicos SÍ está sujeto a la regla.
--   * Si acreditó un nivel antes del 1-jul de la temporada actual, no compite en
--     nivel inferior. Deducción por nivel incorrecto: -2 por panel oficial, hasta -4.
-- =============================================================================

with temp as (
  select id from temporadas where nombre = '2026/2027'
)
insert into reglas_permanencia
  (temporada_id, grupo_permanencia, max_temporadas, por_nivel, aplica_especial, notas)
select temp.id, v.grupo, v.maxt, v.por_nivel, false, v.notas
from temp,
(values
  ('debutantes',  1, false,
   'Debutantes 1 y Debutantes 2 combinados: máx 1 temporada entre ambos. Excepción Pre-Infantil: 1 temporada por nivel. Adulto en estos niveles SÍ aplica.'),
  ('pre_basicos', 1, true,
   'Máx 1 temporada. Adulto en Pre-Básicos SÍ aplica.'),
  ('basicos',     1, true,
   'Máx 1 temporada.')
) as v(grupo, maxt, por_nivel, notas)
on conflict (temporada_id, grupo_permanencia) do nothing;
