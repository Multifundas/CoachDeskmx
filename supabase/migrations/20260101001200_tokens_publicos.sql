-- =============================================================================
-- 20260101001200_tokens_publicos.sql
-- Tokens para páginas públicas /e/[token] (patrón wa.me magic-link).
-- =============================================================================

create type recurso_token as enum ('evento', 'estado_cuenta', 'inscripcion');

create table tokens_publicos (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants (id) on delete cascade,
  token          citext not null unique,
  recurso_tipo   recurso_token not null,
  recurso_id     uuid not null,
  expira_at_utc  timestamptz,
  revocado       boolean not null default false,
  created_at     timestamptz not null default now()
);

comment on table tokens_publicos is
  'Token opaco para acceso público de solo lectura a un recurso (wa.me).';

create index tokens_publicos_recurso_idx on tokens_publicos (recurso_tipo, recurso_id);
create index tokens_publicos_tenant_idx on tokens_publicos (tenant_id);
