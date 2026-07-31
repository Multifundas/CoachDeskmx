-- Seeds concatenados (generado). NO editar a mano.

-- ==== 01_temporada_2026_2027.sql ====
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


-- ==== 02_niveles_infantil.sql ====
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


-- ==== 03_niveles_adulto.sql ====
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


-- ==== 04_niveles_parejas.sql ====
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


-- ==== 05_elementos_examen.sql ====
-- =============================================================================
-- 05_elementos_examen.sql
-- Elementos de examen por nivel (pp.40-48 del PDF), rama infantil.
-- fuera_de_programa = true modela los intentos posteriores a la rutina
-- (Intermedios 2 g, Novicios g, Avanzados 1 h).
-- =============================================================================

-- Helper CTE: id del nivel infantil por clave.
create temporary table _n on commit drop as
select nv.id, nv.clave
from niveles nv
join temporadas t on t.id = nv.temporada_id
where t.nombre = '2026/2027' and nv.rama = 'infantil';

-- ---------- Debutantes 1 (Libre máx 1:30) -----------------------------------
-- Solo componentes; mínimo 3 elementos: 2 saltos no listados + 1 molinete 2 pies.
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_revoluciones, fuera_de_programa)
values
  ((select id from _n where clave='debutantes_1'), 'libre', 1, null,  '2 saltos no listados (unlisted jumps)', null, false),
  ((select id from _n where clave='debutantes_1'), 'libre', 2, '2pB', 'Molinete de 2 pies', null, false);

-- ---------- Debutantes 2 (Libre máx 1:30) -----------------------------------
-- Exactamente 5 elementos diferentes de la lista cerrada.
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_revoluciones, fuera_de_programa)
values
  ((select id from _n where clave='debutantes_2'), 'libre', 1, '1Ma', 'Mariposa', null, false),
  ((select id from _n where clave='debutantes_2'), 'libre', 2, '1Ca', 'Carrito', null, false),
  ((select id from _n where clave='debutantes_2'), 'libre', 3, '1Co', 'Compás hacia atrás', null, false),
  ((select id from _n where clave='debutantes_2'), 'libre', 4, '1To', 'Tornillo', null, false),
  ((select id from _n where clave='debutantes_2'), 'libre', 5, '1Bh', 'Bunny Hop', null, false),
  ((select id from _n where clave='debutantes_2'), 'libre', 6, '1Mz', 'Mazurca', null, false),
  ((select id from _n where clave='debutantes_2'), 'libre', 7, '1BA', 'Águila / Bauer', null, false),
  ((select id from _n where clave='debutantes_2'), 'libre', 8, '2pB', 'Molinete de 2 pies (mínimo 3 rev)', 3, false);

-- ---------- Pre-Básicos -----------------------------------------------------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_revoluciones, fuera_de_programa)
select (select id from _n where clave = 'pre_basicos'), 'libre', o, c, d,
       case when c = 'USp' then 5 else null end,
       false
from (values
  (1, null::text, 'Patinar adelante y atrás en círculo cruzando en ambas direcciones'),
  (2, '1W',       'Salto de Tres (Waltz Jump)'),
  (3, null,       'Gacela con entrada picada'),
  (4, '1Mz',      'Mazurca'),
  (5, '1Co',      'Compás hacia atrás'),
  (6, 'USp',      'Molinete parado SIN VARIACIÓN (mínimo 5 revoluciones)')
) as e(o, c, d);

-- ---------- Básicos ---------------------------------------------------------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_revoluciones, fuera_de_programa)
values
  ((select id from _n where clave='basicos'), 'libre', 1, '1S',    'Salchow (1S)', null, false),
  ((select id from _n where clave='basicos'), 'libre', 2, '1Lo+1T','Combinación Loop + Toeloop (1Lo+1T)', null, false),
  ((select id from _n where clave='basicos'), 'libre', 3, 'SSp',   'Molinete Sentado SIN VARIACIÓN (mínimo 4 rev)', 4, false),
  ((select id from _n where clave='basicos'), 'libre', 4, 'CSp',   'Molinete Camello SIN VARIACIÓN (mínimo 4 rev)', 4, false),
  ((select id from _n where clave='basicos'), 'libre', 5, null,    '4 turns/steps; uno debe ser back inside loop', null, false);

-- ---------- Pre-Preliminar --------------------------------------------------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_revoluciones, fuera_de_programa)
values
  ((select id from _n where clave='pre_preliminar'), 'libre', 1, '1Lz',  'Lutz (1Lz)', null, false),
  ((select id from _n where clave='pre_preliminar'), 'libre', 2, '1F',   'Flip (1F)', null, false),
  ((select id from _n where clave='pre_preliminar'), 'libre', 3, 'CUSp', 'CUSp mínimo 4 por pie (normal a invertido)', 4, false),
  ((select id from _n where clave='pre_preliminar'), 'libre', 4, 'CCSp', 'CCSp mínimo 4 por pie (invertido a normal)', 4, false),
  ((select id from _n where clave='pre_preliminar'), 'libre', 5, null,   '3 turns diferentes; uno debe ser fwd inside bracket', null, false);

-- ---------- Preliminar ------------------------------------------------------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_revoluciones, fuera_de_programa)
values
  ((select id from _n where clave='preliminar'), 'libre', 1, '1F/1Lz+1Lo', 'Combinación Flip o Lutz + Loop (1F/1Lz+1Lo)', null, false),
  ((select id from _n where clave='preliminar'), 'libre', 2, '1A',   'Axel (1A)', null, false),
  ((select id from _n where clave='preliminar'), 'libre', 3, 'CSSp', 'CSSp mínimo 4 por pie', 4, false),
  ((select id from _n where clave='preliminar'), 'libre', 4, 'CCoSp','CCoSp con 3 posiciones base, mínimo 5 rev por pie', 5, false),
  ((select id from _n where clave='preliminar'), 'libre', 5, null,   '3 turns difíciles diferentes; uno fwd inside rocker (Twizzle/Rocker/Loop/Counter/Bracket)', null, false);

-- ---------- Intermedios 1 (programa corto 2:10±10) --------------------------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_nivel_stsq, fuera_de_programa)
values
  ((select id from _n where clave='intermedios_1'), 'corto', 1, '1A',    'Axel (1A)', null, false),
  ((select id from _n where clave='intermedios_1'), 'corto', 2, 'double','Double (2S/2T/2Lo)', null, false),
  ((select id from _n where clave='intermedios_1'), 'corto', 3, 'combo', 'Combinación de saltos', null, false),
  ((select id from _n where clave='intermedios_1'), 'corto', 4, 'FCSp',  'Molinete camello volado (FCSp)', null, false),
  ((select id from _n where clave='intermedios_1'), 'corto', 5, 'CCoSp', 'Molinete combinado (CCoSp)', null, false),
  ((select id from _n where clave='intermedios_1'), 'corto', 6, 'StSq',  'Secuencia de pasos mínimo nivel 1', 1, false);

-- ---------- Intermedios 2 (corto) — incluye g) fuera de programa -------------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_nivel_stsq, fuera_de_programa)
values
  ((select id from _n where clave='intermedios_2'), 'corto', 1, '1A/2A',  'Axel o doble Axel (1A o 2A)', null, false),
  ((select id from _n where clave='intermedios_2'), 'corto', 2, 'double_triple','Double o triple (no 3A)', null, false),
  ((select id from _n where clave='intermedios_2'), 'corto', 3, 'combo',  'Combinación (2º salto toe loop doble/triple para 2026/27)', null, false),
  ((select id from _n where clave='intermedios_2'), 'corto', 4, 'FCSSp',  'FCSSp', null, false),
  ((select id from _n where clave='intermedios_2'), 'corto', 5, 'CCoSp',  'CCoSp', null, false),
  ((select id from _n where clave='intermedios_2'), 'corto', 6, 'StSq',   'Secuencia de pasos mínimo nivel 2', 2, false),
  -- g) 1 intento de 2A (bajado de rotación o cualquier triple), FUERA de programa
  ((select id from _n where clave='intermedios_2'), null, 7, '2A_intento', '1 intento de 2A (o triple); NO forma parte del programa, se ejecuta al terminar', null, true);

-- ---------- Novicios (corto 2:20±10) — incluye g) fuera de programa ----------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_nivel_stsq, fuera_de_programa)
values
  ((select id from _n where clave='novicios'), 'corto', 1, '2A',     'Doble Axel (2A)', null, false),
  ((select id from _n where clave='novicios'), 'corto', 2, 'double_triple','Double o triple', null, false),
  ((select id from _n where clave='novicios'), 'corto', 3, 'combo',  'Combinación de saltos', null, false),
  ((select id from _n where clave='novicios'), 'corto', 4, 'sit_layback','Molinete sentado (niños) / layback o sentado (niñas)', null, false),
  ((select id from _n where clave='novicios'), 'corto', 5, 'spin_combo','Molinete combinado', null, false),
  ((select id from _n where clave='novicios'), 'corto', 6, 'StSq',   'Secuencia de pasos mínimo nivel 2', 2, false),
  -- g) 1 intento de cualquier triple, FUERA de programa
  ((select id from _n where clave='novicios'), null, 7, 'triple_intento', '1 intento de cualquier triple; NO forma parte del programa, al terminar', null, true);

-- ---------- Avanzados 1 (corto 2:40±10) — incluye h) fuera de programa -------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_nivel_stsq, fuera_de_programa)
values
  ((select id from _n where clave='avanzados_1'), 'corto', 1, '2A',    'Doble Axel (2A)', null, false),
  ((select id from _n where clave='avanzados_1'), 'corto', 2, 'triple','Triple', null, false),
  ((select id from _n where clave='avanzados_1'), 'corto', 3, 'combo', 'Combinación de saltos', null, false),
  ((select id from _n where clave='avanzados_1'), 'corto', 4, 'spin1', 'Molinete', null, false),
  ((select id from _n where clave='avanzados_1'), 'corto', 5, 'spin2', 'Molinete combinado', null, false),
  ((select id from _n where clave='avanzados_1'), 'corto', 6, 'StSq',  'Secuencia de pasos', null, false),
  -- h) 1 intento de cualquier triple (sub-rotado), FUERA de programa
  ((select id from _n where clave='avanzados_1'), null, 7, 'triple_intento', '1 intento de cualquier triple (sub-rotado); NO forma parte del programa, al terminar', null, true);

-- ---------- Avanzados 2 (corto 2:40±10) -------------------------------------
insert into elementos_examen (nivel_id, tipo, orden, clave, descripcion, min_nivel_stsq, fuera_de_programa)
values
  ((select id from _n where clave='avanzados_2'), 'corto', 1, '2A',     'Doble Axel (2A) obligatorio', null, false),
  ((select id from _n where clave='avanzados_2'), 'corto', 2, 'triple', 'Triple obligatorio', null, false),
  ((select id from _n where clave='avanzados_2'), 'corto', 3, 'combo',  'Combinación de saltos', null, false),
  ((select id from _n where clave='avanzados_2'), 'corto', 4, 'StSq',   'Secuencia de pasos mínimo nivel 2', 2, false);


-- ==== 06_reglas_permanencia.sql ====
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


-- ==== 07_conceptos_default.sql ====
-- =============================================================================
-- 07_conceptos_default.sql
-- Tenant demo + 10 conceptos base con precio inicial. Los conceptos son por
-- tenant; este bloque provee un catálogo inicial para una maestra nueva.
-- =============================================================================

-- Tenant demo (idempotente por slug).
insert into tenants (id, nombre, slug, timezone_default, plan, activo)
values (
  'dededede-0000-4000-8000-000000000001',
  'Maestra Demo',
  'maestra-demo',
  'America/Mexico_City',
  'trial',
  true
)
on conflict (slug) do nothing;

-- 10 conceptos base.
insert into conceptos (tenant_id, clave, nombre, tipo)
select 'dededede-0000-4000-8000-000000000001', v.clave, v.nombre, v.tipo::tipo_concepto
from (values
  ('clase_individual',   'Clase individual',            'clase'),
  ('clase_grupal',       'Clase grupal',                'clase'),
  ('paquete_mensual',    'Paquete mensual',             'clase'),
  ('inscripcion_anual',  'Inscripción anual',           'inscripcion'),
  ('renta_hielo',        'Renta de hielo',              'otro'),
  ('examen_nivel',       'Examen de nivel',             'examen'),
  ('competencia_cuota',  'Cuota de competencia',        'competencia'),
  ('material_patines',   'Material / patines',          'material'),
  ('seminario',          'Seminario / clínica',         'otro'),
  ('reposicion_clase',   'Reposición de clase',         'clase')
) as v(clave, nombre, tipo)
on conflict (tenant_id, clave) do nothing;

-- Precios iniciales (MXN). Montos de ejemplo, ajustables por la maestra.
insert into conceptos_precios (tenant_id, concepto_id, monto, vigencia_desde)
select c.tenant_id, c.id, p.monto, current_date
from conceptos c
join (values
  ('clase_individual',  450.00),
  ('clase_grupal',      250.00),
  ('paquete_mensual',  3200.00),
  ('inscripcion_anual', 800.00),
  ('renta_hielo',       350.00),
  ('examen_nivel',      600.00),
  ('competencia_cuota', 900.00),
  ('material_patines',    0.00),
  ('seminario',        1200.00),
  ('reposicion_clase',  400.00)
) as p(clave, monto) on p.clave = c.clave
where c.tenant_id = 'dededede-0000-4000-8000-000000000001';


-- ==== 08_politica_cancelacion_default.sql ====
-- =============================================================================
-- 08_politica_cancelacion_default.sql
-- Política de cancelación por defecto para el tenant demo.
-- 24h de aviso sin cargo; menos de 24h -> 100% de cargo con crédito.
-- =============================================================================

insert into politicas_cancelacion
  (tenant_id, nombre, ventana_horas, cargo_pct, genera_credito, activa)
values (
  'dededede-0000-4000-8000-000000000001',
  'Política estándar 24h',
  24,
  100.00,
  true,
  true
)
on conflict do nothing;


-- ==== 09_sedes_demo.sql ====
-- =============================================================================
-- 09_sedes_demo.sql
-- Sedes demo para el tenant demo. Zonas horarias reales de pistas en México.
-- =============================================================================

insert into sedes (tenant_id, nombre, timezone, direccion, activa)
select 'dededede-0000-4000-8000-000000000001', v.nombre, v.tz, v.dir, true
from (values
  ('Pista Ciudad de México', 'America/Mexico_City', 'CDMX'),
  ('Pista Monterrey',        'America/Monterrey',   'Monterrey, N.L.'),
  ('Pista Tijuana',          'America/Tijuana',     'Tijuana, B.C.')
) as v(nombre, tz, dir)
on conflict do nothing;

