-- =============================================================================
-- 20260101001600_consentimientos.sql
-- Consentimientos (LFPDPPP) e incidentes (Código de Deporte Seguro).
-- Los consentimientos son de la persona (global); los incidentes por tenant.
-- =============================================================================

create type tipo_consentimiento as enum ('datos', 'imagen', 'deporte_seguro', 'medico');

-- Consentimiento global de la persona, otorgado por un tutor.
create table consentimientos (
  id                uuid primary key default gen_random_uuid(),
  persona_id        uuid not null references personas (id) on delete cascade,
  tutor_id          uuid references tutores (id) on delete set null,
  tipo              tipo_consentimiento not null,
  otorgado_at_utc   timestamptz not null default now(),
  version_texto     text not null,        -- versión del texto legal aceptado
  revocado_at_utc   timestamptz,
  created_at        timestamptz not null default now()
);

comment on table consentimientos is
  'Consentimiento LFPDPPP/Deporte Seguro de la persona, otorgado por su tutor.';

create type tipo_incidente as enum ('lesion', 'conducta', 'seguridad', 'otro');
create type estado_incidente as enum ('abierto', 'en_seguimiento', 'cerrado');

-- Incidente registrado por la maestra (por tenant).
create table incidentes (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants (id) on delete cascade,
  persona_id       uuid references personas (id) on delete set null,
  tipo             tipo_incidente not null,
  descripcion      text not null,
  reportado_at_utc timestamptz not null default now(),
  estado           estado_incidente not null default 'abierto',
  created_at       timestamptz not null default now()
);

comment on table incidentes is 'Incidente (Deporte Seguro) registrado por la maestra.';

create index consentimientos_persona_idx on consentimientos (persona_id, tipo);
create index incidentes_tenant_idx on incidentes (tenant_id, estado);
