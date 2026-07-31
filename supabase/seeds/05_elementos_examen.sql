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
