-- =============================================================================
-- 20260101000100_tenancy.sql
-- Tenancy y roles. El "tenant" es la maestra (coach) que paga suscripción.
-- =============================================================================

-- Roles de la aplicación. coach_asistente es Fase 2 pero se modela desde ya.
create type rol_app as enum (
  'super_admin',
  'maestra',
  'coach_asistente',
  'tutor',
  'alumna'
);

create type plan_suscripcion as enum ('trial', 'basico', 'pro', 'suspendido');

-- Un registro por maestra/coach.
create table tenants (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  slug              citext not null unique,
  timezone_default  text not null default 'America/Mexico_City',
  plan              plan_suscripcion not null default 'trial',
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table tenants is 'Cada maestra/coach es un tenant con datos aislados por RLS.';

-- Espejo de auth.users con metadatos de la app.
create table app_users (
  id           uuid primary key references auth.users (id) on delete cascade,
  nombre       text not null default '',
  telefono     text,        -- formato E.164
  email        citext,
  created_at   timestamptz not null default now()
);

comment on table app_users is 'Perfil de aplicación asociado a auth.users.';

-- Vincula un usuario con un tenant y un rol. Un usuario puede pertenecer a
-- varios tenants (p. ej. tutor con hijas en distintas maestras).
create table memberships (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants (id) on delete cascade,
  app_user_id uuid not null references app_users (id) on delete cascade,
  rol         rol_app not null,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, app_user_id, rol)
);

comment on table memberships is 'Pertenencia usuario↔tenant con rol; base del RLS.';

create index memberships_app_user_idx on memberships (app_user_id) where activo;
create index memberships_tenant_idx on memberships (tenant_id) where activo;
