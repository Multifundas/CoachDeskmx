-- =============================================================================
-- 01_aislamiento_cross_tenant.sql
-- LA PRUEBA CENTRAL: Coach A jamás puede leer datos privados de Coach B.
-- Intenta lecturas cross-tenant y verifica que RLS las bloquea (0 filas).
-- =============================================================================

begin;
select plan(8);

-- Carga funciones de fixtures (definidas en 00_setup.sql, ya aplicado por reset).
select app_test.montar_fixtures();

-- ---------------------------------------------------------------------------
-- Contexto: actuar como Coach A.
select app_test.actuar_como(
  (select user_a from app_test.ids())
);

-- 1) Coach A ve su PROPIA inscripción.
select is(
  (select count(*)::int from inscripciones
     where id = (select insc_a from app_test.ids())),
  1,
  'Coach A ve su propia inscripción'
);

-- 2) Coach A NO ve la inscripción de Coach B.
select is(
  (select count(*)::int from inscripciones
     where id = (select insc_b from app_test.ids())),
  0,
  'Coach A NO ve la inscripción de Coach B (RLS bloquea)'
);

-- 3) Coach A no ve NINGUNA fila del tenant B en inscripciones.
select is(
  (select count(*)::int from inscripciones
     where tenant_id = (select tenant_b from app_test.ids())),
  0,
  'Coach A no lee inscripciones del tenant B'
);

-- 4) La nota privada de Coach B no es visible para Coach A.
select is(
  (select count(*)::int from inscripciones
     where notas_privadas = 'Nota PRIVADA de Coach B'),
  0,
  'Nota privada de Coach B invisible para Coach A'
);

-- 5) Coach A no puede INSERTAR datos en el tenant de Coach B.
select throws_ok(
  format(
    $q$ insert into sedes (tenant_id, nombre) values (%L, 'Pista pirata') $q$,
    (select tenant_b from app_test.ids())
  ),
  '42501',   -- insufficient_privilege (violación de política RLS)
  null,
  'Coach A no puede insertar en el tenant de Coach B'
);

-- ---------------------------------------------------------------------------
-- Contexto: actuar como Coach B.
select app_test.actuar_como(
  (select user_b from app_test.ids())
);

-- 6) Coach B ve su propia inscripción.
select is(
  (select count(*)::int from inscripciones
     where id = (select insc_b from app_test.ids())),
  1,
  'Coach B ve su propia inscripción'
);

-- 7) Coach B NO ve la inscripción de Coach A.
select is(
  (select count(*)::int from inscripciones
     where id = (select insc_a from app_test.ids())),
  0,
  'Coach B NO ve la inscripción de Coach A (RLS bloquea)'
);

-- 8) La IDENTIDAD global (persona) SÍ es visible para ambos (compartible).
select is(
  (select count(*)::int from personas
     where id = (select persona from app_test.ids())),
  1,
  'La identidad global (persona) es visible para ambos coaches'
);

select app_test.actuar_como_owner();
select * from finish();
rollback;
