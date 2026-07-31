-- =============================================================================
-- 20260101001300_calendario.sql
-- Conexiones de calendario: feed ICS de salida y OAuth (Google/Apple).
-- =============================================================================

create type tipo_calendario as enum ('ics', 'google', 'apple');
create type estado_conexion as enum ('activa', 'revocada', 'error');

create table conexiones_calendario (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id) on delete cascade,
  tipo         tipo_calendario not null,
  token_feed   citext unique,        -- token del feed ICS de salida
  oauth_ref    text,                 -- referencia a credenciales OAuth (no el secreto)
  estado       estado_conexion not null default 'activa',
  created_at   timestamptz not null default now()
);

comment on table conexiones_calendario is
  'Conexión de calendario por maestra (feed ICS o cuenta OAuth).';

create index conexiones_calendario_tenant_idx on conexiones_calendario (tenant_id);
