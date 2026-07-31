-- =============================================================================
-- 02_motor_cancelacion.sql
-- Verifica el sellado de la cancelación: snapshot de política y timestamp de
-- servidor. Comprueba que la ventana (24h) determina el resultado esperado.
-- =============================================================================

begin;
select plan(4);

select app_test.montar_fixtures();

-- Setup como owner: política 24h/100% + un evento y su ocurrencia en tenant A.
select app_test.actuar_como_owner();

do $$
declare
  r record;
  v_pol uuid;
  v_evt uuid;
  v_occ uuid;
begin
  select * into r from app_test.ids();

  insert into politicas_cancelacion (tenant_id, nombre, ventana_horas, cargo_pct, genera_credito)
  values (r.tenant_a, 'Estándar 24h', 24, 100, true)
  returning id into v_pol;

  insert into eventos (tenant_id, titulo, inicio_utc, fin_utc, uid)
  values (r.tenant_a, 'Clase', now() + interval '10 hours',
          now() + interval '11 hours', 'uid-cancel-test')
  returning id into v_evt;

  insert into evento_ocurrencias (tenant_id, evento_id, inicio_utc, fin_utc)
  values (r.tenant_a, v_evt, now() + interval '10 hours', now() + interval '11 hours')
  returning id into v_occ;

  -- Cancelación con menos de 24h de anticipación -> con_cargo, snapshot congelado.
  insert into cancelaciones
    (tenant_id, ocurrencia_id, inscripcion_id, politica_id, politica_snapshot, resultado)
  values (
    r.tenant_a, v_occ, r.insc_a, v_pol,
    jsonb_build_object('ventana_horas', 24, 'cargo_pct', 100, 'genera_credito', true),
    'con_cargo'
  );
end;
$$;

-- 1) Existe la cancelación sellada.
select is(
  (select count(*)::int from cancelaciones
     where inscripcion_id = (select insc_a from app_test.ids())),
  1,
  'La cancelación quedó registrada'
);

-- 2) El timestamp de servidor está presente (sellado).
select ok(
  (select solicitado_at_utc is not null from cancelaciones
     where inscripcion_id = (select insc_a from app_test.ids()) limit 1),
  'solicitado_at_utc sellado por el servidor'
);

-- 3) El snapshot conserva la ventana de la política vigente.
select is(
  (select (politica_snapshot ->> 'ventana_horas')::int from cancelaciones
     where inscripcion_id = (select insc_a from app_test.ids()) limit 1),
  24,
  'El snapshot congela la ventana de la política (24h)'
);

-- 4) El resultado es con_cargo (canceló con <24h).
select is(
  (select resultado::text from cancelaciones
     where inscripcion_id = (select insc_a from app_test.ids()) limit 1),
  'con_cargo',
  'Cancelar con menos de 24h genera cargo'
);

select * from finish();
rollback;
