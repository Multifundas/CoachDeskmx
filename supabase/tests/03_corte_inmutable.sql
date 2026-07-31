-- =============================================================================
-- 03_corte_inmutable.sql
-- Verifica que estados_cuenta es inmutable: UPDATE y DELETE fallan por trigger.
-- =============================================================================

begin;
select plan(3);

select app_test.montar_fixtures();
select app_test.actuar_como_owner();

-- Crea un estado de cuenta sellado en tenant A.
do $$
declare r record;
begin
  select * into r from app_test.ids();
  insert into estados_cuenta
    (tenant_id, inscripcion_id, folio, periodo, total, snapshot)
  values (
    r.tenant_a, r.insc_a, 'A-2026-07-0001', '2026-07', 1350.00,
    jsonb_build_object('cargos', jsonb_build_array(), 'pagos', jsonb_build_array())
  );
end;
$$;

-- 1) El estado de cuenta existe.
select is(
  (select count(*)::int from estados_cuenta where folio = 'A-2026-07-0001'),
  1,
  'El estado de cuenta se selló'
);

-- 2) UPDATE falla (inmutable).
select throws_ok(
  $q$ update estados_cuenta set total = 0 where folio = 'A-2026-07-0001' $q$,
  null,
  null,
  'UPDATE sobre estado de cuenta sellado es rechazado'
);

-- 3) DELETE falla (inmutable).
select throws_ok(
  $q$ delete from estados_cuenta where folio = 'A-2026-07-0001' $q$,
  null,
  null,
  'DELETE sobre estado de cuenta sellado es rechazado'
);

select * from finish();
rollback;
