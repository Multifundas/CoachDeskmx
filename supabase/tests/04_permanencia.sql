-- =============================================================================
-- 04_permanencia.sql
-- Verifica el catálogo de reglas de permanencia (§6.5) sembrado y la lógica
-- de "temporadas acumuladas en un grupo" a partir de logros.
-- =============================================================================

begin;
select plan(4);

-- 1) Existe la regla combinada de Debutantes (máx 1 temporada, no por nivel).
select is(
  (select max_temporadas from reglas_permanencia rp
     join temporadas t on t.id = rp.temporada_id
     where t.nombre = '2026/2027' and rp.grupo_permanencia = 'debutantes'),
  1,
  'Regla Debutantes: máx 1 temporada'
);

-- 2) Debutantes es COMBINADO (por_nivel = false).
select is(
  (select por_nivel from reglas_permanencia rp
     join temporadas t on t.id = rp.temporada_id
     where t.nombre = '2026/2027' and rp.grupo_permanencia = 'debutantes'),
  false,
  'Debutantes 1 + Debutantes 2 se cuentan combinados'
);

-- 3) Pre-Básicos es por nivel (por_nivel = true).
select is(
  (select por_nivel from reglas_permanencia rp
     join temporadas t on t.id = rp.temporada_id
     where t.nombre = '2026/2027' and rp.grupo_permanencia = 'pre_basicos'),
  true,
  'Pre-Básicos se cuenta por nivel'
);

-- 4) Ninguna regla sembrada aplica a la categoría Especial.
select is(
  (select count(*)::int from reglas_permanencia rp
     join temporadas t on t.id = rp.temporada_id
     where t.nombre = '2026/2027' and rp.aplica_especial = true),
  0,
  'La regla de permanencia NO aplica a categoría Especial'
);

select * from finish();
rollback;
