-- =============================================================================
-- 02_niveles_infantil.sql
-- 11 niveles de la rama INFANTIL, verbatim del PDF (Reglamento Técnico 2026/2027).
-- Duraciones/tolerancias/factores por programa. Grupos de permanencia §6.5.
--
-- Convención de tolerancia: "±10s" se guarda como tolerancia_seg = 10.
-- Programas "máx X:YY" se guardan con tolerancia_seg = 0 (tope, no rango).
-- =============================================================================

with temp as (
  select id from temporadas where nombre = '2026/2027'
)
insert into niveles
  (temporada_id, rama, clave, nombre, orden, grupo_permanencia, requiere_corto)
select temp.id, 'infantil', v.clave, v.nombre, v.orden, v.grupo, v.corto
from temp,
(values
  ('debutantes_1',  'Debutantes 1',   1,  'debutantes',   false),
  ('debutantes_2',  'Debutantes 2',   2,  'debutantes',   false),
  ('pre_basicos',   'Pre-Básicos',    3,  'pre_basicos',  false),
  ('basicos',       'Básicos',        4,  'basicos',      false),
  ('pre_preliminar','Pre-Preliminar', 5,  null,           false),
  ('preliminar',    'Preliminar',     6,  null,           false),
  ('intermedios_1', 'Intermedios 1',  7,  null,           true),
  ('intermedios_2', 'Intermedios 2',  8,  null,           true),
  ('novicios',      'Novicios',       9,  null,           true),
  ('avanzados_1',   'Avanzados 1',    10, null,           true),
  ('avanzados_2',   'Avanzados 2',    11, null,           true)
) as v(clave, nombre, orden, grupo, corto)
on conflict (temporada_id, rama, clave) do nothing;

-- ---------- Programas (duración/tolerancia/factor de componentes) -----------
-- Helper: inserta un programa para (clave de nivel) dado.
with n as (
  select nv.id, nv.clave
  from niveles nv
  join temporadas t on t.id = nv.temporada_id
  where t.nombre = '2026/2027' and nv.rama = 'infantil'
)
insert into niveles_programa (nivel_id, tipo, duracion_seg, tolerancia_seg, factor_componentes)
select n.id, p.tipo::tipo_programa, p.dur, p.tol, p.factor
from n
join (values
  -- Debutantes 1: Libre máx 1:30, solo componentes, factor 1.25
  ('debutantes_1',  'libre',  90,  0,  1.25),
  -- Debutantes 2: Libre máx 1:30, factor 1.50
  ('debutantes_2',  'libre',  90,  0,  1.50),
  -- Pre-Básicos: Libre máx 1:50, factor 1.75
  ('pre_basicos',   'libre',  110, 0,  1.75),
  -- Básicos: Libre máx 2:00
  ('basicos',       'libre',  120, 0,  null),
  -- Pre-Preliminar: Libre máx 2:20
  ('pre_preliminar','libre',  140, 0,  null),
  -- Preliminar: Libre máx 2:20
  ('preliminar',    'libre',  140, 0,  null),
  -- Intermedios 1: Corto 2:10±10, Libre 2:40±10
  ('intermedios_1', 'corto',  130, 10, null),
  ('intermedios_1', 'libre',  160, 10, null),
  -- Intermedios 2: Corto 2:10±10, Libre 3:00±10
  ('intermedios_2', 'corto',  130, 10, null),
  ('intermedios_2', 'libre',  180, 10, null),
  -- Novicios: Corto 2:20±10, Libre 3:00±10
  ('novicios',      'corto',  140, 10, null),
  ('novicios',      'libre',  180, 10, null),
  -- Avanzados 1: Corto 2:40±10, Libre 3:30±10
  ('avanzados_1',   'corto',  160, 10, null),
  ('avanzados_1',   'libre',  210, 10, null),
  -- Avanzados 2: Corto 2:40±10, Libre 4:00±10
  ('avanzados_2',   'corto',  160, 10, null),
  ('avanzados_2',   'libre',  240, 10, null)
) as p(clave, tipo, dur, tol, factor) on p.clave = n.clave
on conflict (nivel_id, tipo) do nothing;
