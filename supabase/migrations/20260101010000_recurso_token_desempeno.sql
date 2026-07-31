-- =============================================================================
-- 20260101010000_recurso_token_desempeno.sql
-- Añade el valor 'desempeno' al enum recurso_token para poder compartir el
-- desempeño de una alumna por enlace público /d/[token] (solo lectura).
-- Va en su propia migración: ALTER TYPE ... ADD VALUE no puede usarse en la
-- misma transacción que lo agrega (caveat de PostgreSQL < 15).
-- =============================================================================

alter type recurso_token add value if not exists 'desempeno';
