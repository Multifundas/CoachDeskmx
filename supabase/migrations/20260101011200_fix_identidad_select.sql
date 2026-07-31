-- =============================================================================
-- 20260101011200_fix_identidad_select.sql
-- Fix de aislamiento de la identidad global (personas / tutores / persona_tutor).
--
-- Dos bugs de las políticas base (20260101002100):
--   1) La política "_write" era FOR ALL con using(current_user_id() is not null).
--      FOR ALL cubre TAMBIÉN el SELECT, así que aunque se endurezca "_select",
--      cualquier autenticado seguía leyendo todo. Se separa "_write" en políticas
--      por comando (insert/update/delete), sin SELECT implícito.
--   2) Endurecer tutores/persona_tutor con EXISTS mutuos entre esas dos tablas
--      provoca "infinite recursion detected in policy". Se resuelve con helpers
--      SECURITY DEFINER (app.tutor_visible / app.persona_tutor_visible) que
--      consultan sin re-disparar RLS.
--
-- Escritura de identidad: sigue abierta a cualquier coach autenticado (crear/
-- editar identidad global no filtra datos privados entre tenants, y el alta de
-- alumna crea la persona ANTES de su inscripción). Idempotente.
-- Requiere helpers de 20260101011000.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PERSONAS
-- ---------------------------------------------------------------------------
-- Quitar la política FOR ALL que daba SELECT abierto.
drop policy if exists personas_write on personas;
-- Escritura por comando (sin SELECT implícito).
drop policy if exists personas_insert on personas;
create policy personas_insert on personas
  for insert with check (app.current_user_id() is not null);
drop policy if exists personas_update on personas;
create policy personas_update on personas
  for update using (app.current_user_id() is not null)
  with check (app.current_user_id() is not null);
drop policy if exists personas_delete on personas;
create policy personas_delete on personas
  for delete using (app.current_user_id() is not null);

-- SELECT endurecido: coach del tenant (vía inscripción) o vínculo propio.
drop policy if exists personas_select on personas;
create policy personas_select on personas
  for select using (app.persona_de_coach(id));

drop policy if exists personas_select_alumna on personas;
create policy personas_select_alumna on personas
  for select using (app.persona_de_alumna(id));

drop policy if exists personas_select_tutor on personas;
create policy personas_select_tutor on personas
  for select using (app.persona_de_tutor(id));

-- ---------------------------------------------------------------------------
-- TUTORES
-- ---------------------------------------------------------------------------
drop policy if exists tutores_write on tutores;
drop policy if exists tutores_insert on tutores;
create policy tutores_insert on tutores
  for insert with check (app.current_user_id() is not null);
drop policy if exists tutores_update on tutores;
create policy tutores_update on tutores
  for update using (app.current_user_id() is not null)
  with check (app.current_user_id() is not null);
drop policy if exists tutores_delete on tutores;
create policy tutores_delete on tutores
  for delete using (app.current_user_id() is not null);

drop policy if exists tutores_select on tutores;
create policy tutores_select on tutores
  for select using (app.tutor_visible(id));

-- ---------------------------------------------------------------------------
-- PERSONA_TUTOR
-- ---------------------------------------------------------------------------
drop policy if exists persona_tutor_write on persona_tutor;
drop policy if exists persona_tutor_insert on persona_tutor;
create policy persona_tutor_insert on persona_tutor
  for insert with check (app.current_user_id() is not null);
drop policy if exists persona_tutor_update on persona_tutor;
create policy persona_tutor_update on persona_tutor
  for update using (app.current_user_id() is not null)
  with check (app.current_user_id() is not null);
drop policy if exists persona_tutor_delete on persona_tutor;
create policy persona_tutor_delete on persona_tutor
  for delete using (app.current_user_id() is not null);

drop policy if exists persona_tutor_select on persona_tutor;
create policy persona_tutor_select on persona_tutor
  for select using (app.persona_tutor_visible(persona_id, tutor_id));
