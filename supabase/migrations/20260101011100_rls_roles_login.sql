-- =============================================================================
-- 20260101011100_rls_roles_login.sql
-- Endurece el aislamiento de tablas-tenant y abre acceso de SOLO LECTURA a los
-- roles familiares (TUTOR y ALUMNA) acotado a sus propias inscripciones.
--
-- Contexto de seguridad:
--   memberships.tenant_id es NOT NULL, así que para que un tutor/alumna tenga
--   rol (vía getSesion) necesita una membership en el tenant de la maestra.
--   Las políticas originales (20260101002100) usan solo app.is_member(tenant_id),
--   que es TRUE para CUALQUIER membership activa → expondría todo el tenant.
--
-- Solución (Postgres combina políticas permissive del mismo comando con OR):
--   1) Reemplazar is_member → es_coach en las 4 políticas de cada tabla-tenant
--      (RESTRINGE: cierra la fuga; no-op hoy porque solo hay coaches).
--   2) Añadir políticas SELECT por rol (SUMA acceso acotado por app_user_id).
--
-- Las mutaciones siguen siendo exclusivas de coach. El vínculo se asigna con
-- service_role (login-vinculo-actions).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) ENDURECER: is_member → es_coach en las tablas con tenant_id.
--    Mismo array y mismos nombres de política que 20260101002100 (idempotente).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'inscripciones','inscripcion_tarifas',
    'sedes','bloques_hielo',
    'conceptos','conceptos_precios',
    'eventos','evento_ocurrencias','asistencias',
    'politicas_cancelacion','cancelaciones',
    'creditos','creditos_consumos',
    'cargos','estados_cuenta',
    'pagos','pagos_aplicaciones',
    'tokens_publicos','conexiones_calendario',
    'competencias','competencia_inscripciones',
    'gastos','incidentes'
  ]
  loop
    execute format('drop policy if exists %I on %I;', t || '_select', t);
    execute format(
      'create policy %I on %I for select using (app.es_coach(tenant_id));',
      t || '_select', t);

    execute format('drop policy if exists %I on %I;', t || '_insert', t);
    execute format(
      'create policy %I on %I for insert with check (app.es_coach(tenant_id));',
      t || '_insert', t);

    execute format('drop policy if exists %I on %I;', t || '_update', t);
    execute format(
      'create policy %I on %I for update using (app.es_coach(tenant_id)) with check (app.es_coach(tenant_id));',
      t || '_update', t);

    execute format('drop policy if exists %I on %I;', t || '_delete', t);
    execute format(
      'create policy %I on %I for delete using (app.es_coach(tenant_id));',
      t || '_delete', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) IDENTIDAD (personas / tutores / persona_tutor): el endurecimiento completo
--    (incluida la separación de las políticas FOR ALL de escritura, que daban
--    SELECT abierto, y el uso de helpers SECURITY DEFINER para evitar recursión
--    entre tutores y persona_tutor) vive en 20260101011200_fix_identidad_select.
--    Aquí solo se dejan las políticas de rol sobre personas (idempotentes); la
--    base y las de tutores/persona_tutor las fija esa migración posterior.
-- ---------------------------------------------------------------------------

drop policy if exists personas_select_alumna on personas;
create policy personas_select_alumna on personas
  for select using (app.persona_de_alumna(id));

drop policy if exists personas_select_tutor on personas;
create policy personas_select_tutor on personas
  for select using (app.persona_de_tutor(id));

-- ---------------------------------------------------------------------------
-- 3) INSCRIPCIONES: SELECT por rol (acotado por persona_id).
-- ---------------------------------------------------------------------------
drop policy if exists inscripciones_select_alumna on inscripciones;
create policy inscripciones_select_alumna on inscripciones
  for select using (app.persona_de_alumna(persona_id));

drop policy if exists inscripciones_select_tutor on inscripciones;
create policy inscripciones_select_tutor on inscripciones
  for select using (app.persona_de_tutor(persona_id));

-- ---------------------------------------------------------------------------
-- 4) TABLAS CON inscripcion_id directo: SELECT acotado a inscripciones visibles.
--    - Agenda/progreso (tutor y alumna): asistencias, desempeno_elementos, tareas_alumna.
--    - Finanzas (SOLO tutor): cargos, estados_cuenta, pagos.
-- ---------------------------------------------------------------------------

-- asistencias (tutor + alumna): base de la agenda.
drop policy if exists asistencias_select_alumna on asistencias;
create policy asistencias_select_alumna on asistencias
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_alumna(i.persona_id)
    )
  );

drop policy if exists asistencias_select_tutor on asistencias;
create policy asistencias_select_tutor on asistencias
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_tutor(i.persona_id)
    )
  );

-- desempeno_elementos (tutor + alumna): progreso.
drop policy if exists desempeno_elementos_select_alumna on desempeno_elementos;
create policy desempeno_elementos_select_alumna on desempeno_elementos
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_alumna(i.persona_id)
    )
  );

drop policy if exists desempeno_elementos_select_tutor on desempeno_elementos;
create policy desempeno_elementos_select_tutor on desempeno_elementos
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_tutor(i.persona_id)
    )
  );

-- tareas_alumna (tutor + alumna): checklist.
drop policy if exists tareas_alumna_select_alumna on tareas_alumna;
create policy tareas_alumna_select_alumna on tareas_alumna
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_alumna(i.persona_id)
    )
  );

drop policy if exists tareas_alumna_select_tutor on tareas_alumna;
create policy tareas_alumna_select_tutor on tareas_alumna
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_tutor(i.persona_id)
    )
  );

-- cargos (SOLO tutor): finanzas.
drop policy if exists cargos_select_tutor on cargos;
create policy cargos_select_tutor on cargos
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_tutor(i.persona_id)
    )
  );

-- estados_cuenta (SOLO tutor): finanzas.
drop policy if exists estados_cuenta_select_tutor on estados_cuenta;
create policy estados_cuenta_select_tutor on estados_cuenta
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_tutor(i.persona_id)
    )
  );

-- pagos (SOLO tutor): finanzas.
drop policy if exists pagos_select_tutor on pagos;
create policy pagos_select_tutor on pagos
  for select using (
    inscripcion_id in (
      select i.id from inscripciones i where app.persona_de_tutor(i.persona_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5) EVENTOS y EVENTO_OCURRENCIAS: son tenant-wide (clases grupales) y se ligan
--    a las alumnas solo vía asistencias. Se abre SELECT a las ocurrencias/eventos
--    en los que la persona (alumna o tutor) tiene una asistencia registrada.
-- ---------------------------------------------------------------------------

-- evento_ocurrencias visibles = aquellas con una asistencia de mi inscripción.
drop policy if exists evento_ocurrencias_select_alumna on evento_ocurrencias;
create policy evento_ocurrencias_select_alumna on evento_ocurrencias
  for select using (
    id in (
      select a.ocurrencia_id
      from asistencias a
      join inscripciones i on i.id = a.inscripcion_id
      where app.persona_de_alumna(i.persona_id)
    )
  );

drop policy if exists evento_ocurrencias_select_tutor on evento_ocurrencias;
create policy evento_ocurrencias_select_tutor on evento_ocurrencias
  for select using (
    id in (
      select a.ocurrencia_id
      from asistencias a
      join inscripciones i on i.id = a.inscripcion_id
      where app.persona_de_tutor(i.persona_id)
    )
  );

-- eventos visibles = aquellos con una ocurrencia visible por asistencia propia.
drop policy if exists eventos_select_alumna on eventos;
create policy eventos_select_alumna on eventos
  for select using (
    id in (
      select o.evento_id
      from evento_ocurrencias o
      join asistencias a on a.ocurrencia_id = o.id
      join inscripciones i on i.id = a.inscripcion_id
      where app.persona_de_alumna(i.persona_id)
    )
  );

drop policy if exists eventos_select_tutor on eventos;
create policy eventos_select_tutor on eventos
  for select using (
    id in (
      select o.evento_id
      from evento_ocurrencias o
      join asistencias a on a.ocurrencia_id = o.id
      join inscripciones i on i.id = a.inscripcion_id
      where app.persona_de_tutor(i.persona_id)
    )
  );
