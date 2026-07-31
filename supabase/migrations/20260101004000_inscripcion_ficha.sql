-- =============================================================================
-- 20260101004000_inscripcion_ficha.sql
-- Ficha ampliada de la alumna dentro de la INSCRIPCIÓN (privada por maestra).
-- Modelo operativo: cada maestra gestiona su propio grupo de forma totalmente
-- independiente, por lo que estos datos de contacto viven en inscripciones
-- (aislados por RLS) y NO en la identidad global compartida.
-- =============================================================================

alter table inscripciones
  -- Datos de la alumna (contacto directo).
  add column if not exists telefono_alumna   text,
  add column if not exists sexo               sexo_persona,
  add column if not exists club               text,   -- deportivo que representa

  -- Responsable / tutor (un solo contacto principal).
  add column if not exists tutor_nombre       text,
  add column if not exists tutor_telefono     text,
  add column if not exists tutor_email        text,
  add column if not exists tutor_parentesco   parentesco,

  -- Emergencia y salud.
  add column if not exists emergencia_nombre    text,
  add column if not exists emergencia_telefono  text,
  add column if not exists notas_medicas        text;

comment on column inscripciones.telefono_alumna is 'Teléfono directo de la alumna (privado por maestra).';
comment on column inscripciones.club is 'Club/deportivo que representa la alumna.';
comment on column inscripciones.tutor_nombre is 'Nombre del responsable principal.';
comment on column inscripciones.notas_medicas is 'Alergias/condiciones médicas relevantes (privado).';
