-- =============================================================================
-- 04_niveles_parejas.sql
-- Rama PAREJAS: Master/Master Elite, Intermediate, Adult.
-- Programas Corto (libre en tabla) y Artístico según PDF.
-- =============================================================================

with temp as (
  select id from temporadas where nombre = '2026/2027'
)
insert into niveles
  (temporada_id, rama, clave, nombre, orden, grupo_permanencia, requiere_corto)
select temp.id, 'parejas', v.clave, v.nombre, v.orden, null, false
from temp,
(values
  ('parejas_master_elite', 'Master / Master Elite', 1),
  ('parejas_intermediate', 'Intermediate',          2),
  ('parejas_adult',        'Adult',                 3)
) as v(clave, nombre, orden)
on conflict (temporada_id, rama, clave) do nothing;

-- ---------- Programas (Libre / Artístico) -----------------------------------
with n as (
  select nv.id, nv.clave
  from niveles nv
  join temporadas t on t.id = nv.temporada_id
  where t.nombre = '2026/2027' and nv.rama = 'parejas'
)
insert into niveles_programa (nivel_id, tipo, duracion_seg, tolerancia_seg, factor_componentes)
select n.id, p.tipo::tipo_programa, p.dur, p.tol, null
from n
join (values
  -- Master/Master Elite: Libre 3:30±10, Artístico 2:10±10
  ('parejas_master_elite', 'libre',     210, 10),
  ('parejas_master_elite', 'artistico', 130, 10),
  -- Intermediate: Libre 2:40±10, Artístico 1:40±10
  ('parejas_intermediate', 'libre',     160, 10),
  ('parejas_intermediate', 'artistico', 100, 10),
  -- Adult: Libre 2:20±10, Artístico 1:40±10
  ('parejas_adult',        'libre',     140, 10),
  ('parejas_adult',        'artistico', 100, 10)
) as p(clave, tipo, dur, tol) on p.clave = n.clave
on conflict (nivel_id, tipo) do nothing;
