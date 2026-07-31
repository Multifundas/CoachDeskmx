-- =============================================================================
-- 20260101000200_identidad.sql
-- Capa de IDENTIDAD GLOBAL (sin tenant_id).
-- La persona (alumna) es única a nivel plataforma. Sus datos privados por
-- maestra viven en la capa de INSCRIPCIÓN (otra migración), nunca aquí.
-- =============================================================================

create type sexo_persona as enum ('f', 'm', 'x');

-- Identidad global de la alumna/patinadora. NO lleva tenant_id a propósito:
-- una misma persona puede estar inscrita con varias maestras sin duplicar
-- su identidad ni exponer datos privados de una maestra a otra.
create table personas (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  apellidos          text not null,
  fecha_nacimiento   date,
  sexo               sexo_persona,
  foto_url           text,
  -- nivel_actual_id se referencia tras crear niveles (FK diferida en otra
  -- migración vía ALTER para evitar dependencia circular).
  nivel_actual_id    uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table personas is
  'Identidad global de la patinadora (sin tenant). Datos compartibles, no privados.';

-- Tutor: titular de credenciales reales (la mayoría de alumnas son menores).
create table tutores (
  id           uuid primary key default gen_random_uuid(),
  app_user_id  uuid references app_users (id) on delete set null,
  nombre       text not null,
  telefono     text,       -- E.164
  email        citext,
  created_at   timestamptz not null default now()
);

comment on table tutores is 'Tutor/responsable; suele tener las credenciales reales.';

create type parentesco as enum (
  'madre', 'padre', 'tutor_legal', 'abuelo', 'otro', 'la_misma'
);

-- Vínculo persona↔tutor (una persona puede tener varios tutores).
create table persona_tutor (
  id                     uuid primary key default gen_random_uuid(),
  persona_id             uuid not null references personas (id) on delete cascade,
  tutor_id               uuid not null references tutores (id) on delete cascade,
  parentesco             parentesco not null default 'tutor_legal',
  es_contacto_principal  boolean not null default false,
  created_at             timestamptz not null default now(),
  unique (persona_id, tutor_id)
);

comment on table persona_tutor is 'Relación entre patinadora y sus tutores.';

-- Logros/acreditaciones de nivel, globales a la persona (no por maestra).
-- Se referencia niveles(id) mediante ALTER en la migración de niveles.
create table logros (
  id                   uuid primary key default gen_random_uuid(),
  persona_id           uuid not null references personas (id) on delete cascade,
  nivel_id             uuid not null,
  temporada_id         uuid not null,
  fecha_acreditacion   date not null,
  created_at           timestamptz not null default now()
);

comment on table logros is
  'Acreditaciones de nivel de la persona (globales). Base para permanencia.';

create index personas_nombre_idx on personas (apellidos, nombre);
create index logros_persona_idx on logros (persona_id);
