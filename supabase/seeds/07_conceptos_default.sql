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
