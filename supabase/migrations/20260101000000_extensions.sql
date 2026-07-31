-- =============================================================================
-- 20260101000000_extensions.sql
-- Extensiones base + esquema de helpers de aplicación.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- texto case-insensitive (tokens, emails)

-- Esquema donde viven las funciones de apoyo de la aplicación (RLS, tenancy).
create schema if not exists app;

comment on schema app is
  'Funciones y helpers de aplicación (contexto de tenant, roles, RLS).';
