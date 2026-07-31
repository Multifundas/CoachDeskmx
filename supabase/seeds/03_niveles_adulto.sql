-- =============================================================================
-- 03_niveles_adulto.sql
-- Rama ADULTO: 5 niveles (Bronce, Plata, Oro, Masters, Masters Elite).
-- Cada uno con programa Libre y Artístico. Clases de edad I–V.
-- =============================================================================

with temp as (
  select id from temporadas where nombre = '2026/2027'
)
insert into niveles
  (temporada_id, rama, clave, nombre, orden, grupo_permanencia, requiere_corto)
select temp.id, 'adulto', v.clave, v.nombre, v.orden, null, false
from temp,
(values
  ('bronce',        'Bronce',        1),
  ('plata',         'Plata',         2),
  ('oro',           'Oro',           3),
  ('masters',       'Masters',       4),
  ('masters_elite', 'Masters Elite', 5)
) as v(clave, nombre, orden)
on conflict (temporada_id, rama, clave) do nothing;

-- ---------- Programas Libre / Artístico (con tolerancia ±10s) ---------------
with n as (
  select nv.id, nv.clave
  from niveles nv
  join temporadas t on t.id = nv.temporada_id
  where t.nombre = '2026/2027' and nv.rama = 'adulto'
)
insert into niveles_programa (nivel_id, tipo, duracion_seg, tolerancia_seg, factor_componentes)
select n.id, p.tipo::tipo_programa, p.dur, p.tol, null
from n
join (values
  -- Bronce: Libre 1:40±10, Artístico 1:30±10
  ('bronce',        'libre',     100, 10),
  ('bronce',        'artistico',  90, 10),
  -- Plata: Libre 2:00±10, Artístico 1:30±10
  ('plata',         'libre',     120, 10),
  ('plata',         'artistico',  90, 10),
  -- Oro: Libre 2:50±10, Artístico 1:30±10
  ('oro',           'libre',     170, 10),
  ('oro',           'artistico',  90, 10),
  -- Masters: Libre 3:00±10, Artístico 2:00±10
  ('masters',       'libre',     180, 10),
  ('masters',       'artistico', 120, 10),
  -- Masters Elite: Libre 3:00±10, Artístico 2:00±10
  ('masters_elite', 'libre',     180, 10),
  ('masters_elite', 'artistico', 120, 10)
) as p(clave, tipo, dur, tol) on p.clave = n.clave
on conflict (nivel_id, tipo) do nothing;

-- ---------- Clases de edad adulto (fronteras 1-jul, por año de nacimiento) ---
-- Class I: 1988–1998, II: 1978–1988, III: 1968–1978, IV: 1958–1968,
-- V: 1958 o antes.
with temp as (
  select id from temporadas where nombre = '2026/2027'
)
insert into clases_edad_adulto (temporada_id, clave, anio_desde, anio_hasta)
select temp.id, v.clave, v.desde, v.hasta
from temp,
(values
  ('I',   1988, 1998),
  ('II',  1978, 1988),
  ('III', 1968, 1978),
  ('IV',  1958, 1968),
  ('V',   null, 1958)
) as v(clave, desde, hasta)
on conflict (temporada_id, clave) do nothing;
