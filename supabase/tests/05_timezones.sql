-- =============================================================================
-- 05_timezones.sql
-- Verifica el manejo de zonas horarias: se almacena en UTC (timestamptz) y se
-- resuelve contra la zona de la sede. Comprueba conversión CDMX y Tijuana.
-- =============================================================================

begin;
select plan(4);

-- 1) Las columnas de instante son timestamptz (almacenan UTC internamente).
select is(
  (select data_type from information_schema.columns
     where table_name = 'eventos' and column_name = 'inicio_utc'),
  'timestamp with time zone',
  'eventos.inicio_utc es timestamptz (UTC)'
);

-- 2) Un mismo instante UTC se ve distinto según la sede.
-- 2026-01-15 18:00 UTC -> CDMX (UTC-6) = 12:00 ; Tijuana (UTC-8) = 10:00.
select is(
  to_char(
    (timestamptz '2026-01-15 18:00:00+00') at time zone 'America/Mexico_City',
    'HH24:MI'
  ),
  '12:00',
  'Instante UTC resuelto a hora local de CDMX'
);

select is(
  to_char(
    (timestamptz '2026-01-15 18:00:00+00') at time zone 'America/Tijuana',
    'HH24:MI'
  ),
  '10:00',
  'Mismo instante UTC resuelto a hora local de Tijuana'
);

-- 3) Round-trip: hora local de sede -> UTC -> local de sede es estable.
select is(
  to_char(
    ((timestamp '2026-01-15 12:00:00' at time zone 'America/Mexico_City')
       at time zone 'America/Mexico_City'),
    'YYYY-MM-DD HH24:MI'
  ),
  '2026-01-15 12:00',
  'Round-trip local->UTC->local es estable para CDMX'
);

select * from finish();
rollback;
