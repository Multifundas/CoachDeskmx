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
