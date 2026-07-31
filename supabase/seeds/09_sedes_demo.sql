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
