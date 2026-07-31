-- =============================================================================
-- 20260101002100_rls_policies.sql
-- Habilita RLS en TODAS las tablas y define políticas.
--
-- Estrategia:
--   * Tablas con tenant_id  -> visibles/mutables solo si tenant_id ∈ tenants
--                              del usuario. (Aislamiento crítico entre maestras.)
--   * Identidad global      -> lectura para miembros autenticados; NO expone
--                              datos privados (esos viven en capa inscripción).
--   * Catálogo FEMEPASHIDI  -> lectura para autenticados; escritura super_admin.
--
-- Nota: RLS NO aplica al rol de servicio (service_role) ni al owner, por lo que
-- las migraciones/seeds corren sin restricción. Las pruebas pgTAP simulan un
-- usuario autenticado fijando request.jwt.claims.
-- =============================================================================

-- ---------- helper local: activa RLS + FORCE en una tabla -------------------
-- (FORCE asegura que ni el owner evada RLS durante las pruebas.)

-- ============================ TENANCY =======================================
alter table tenants enable row level security;
alter table tenants force row level security;

create policy tenants_select on tenants
  for select using (app.is_member(id));
create policy tenants_all on tenants
  for all using (app.is_super_admin()) with check (app.is_super_admin());

alter table app_users enable row level security;
alter table app_users force row level security;

-- Cada quien ve/edita su propio perfil; super_admin todo.
create policy app_users_self on app_users
  for select using (id = app.current_user_id() or app.is_super_admin());
create policy app_users_self_upd on app_users
  for update using (id = app.current_user_id() or app.is_super_admin())
  with check (id = app.current_user_id() or app.is_super_admin());

alter table memberships enable row level security;
alter table memberships force row level security;

-- Un usuario ve sus propios memberships; la maestra ve los de su tenant.
create policy memberships_select on memberships
  for select using (
    app_user_id = app.current_user_id()
    or app.is_member(tenant_id)
  );
create policy memberships_write on memberships
  for all using (
    app.has_role(tenant_id, 'maestra') or app.is_super_admin()
  ) with check (
    app.has_role(tenant_id, 'maestra') or app.is_super_admin()
  );

-- ============================ IDENTIDAD GLOBAL ==============================
-- Lectura para cualquier usuario autenticado. La identidad es compartible;
-- lo privado (tarifas/cargos/notas) NO está aquí.
alter table personas enable row level security;
alter table personas force row level security;
create policy personas_select on personas
  for select using (app.current_user_id() is not null);
create policy personas_write on personas
  for all using (app.current_user_id() is not null)
  with check (app.current_user_id() is not null);

alter table tutores enable row level security;
alter table tutores force row level security;
create policy tutores_select on tutores
  for select using (app.current_user_id() is not null);
create policy tutores_write on tutores
  for all using (app.current_user_id() is not null)
  with check (app.current_user_id() is not null);

alter table persona_tutor enable row level security;
alter table persona_tutor force row level security;
create policy persona_tutor_select on persona_tutor
  for select using (app.current_user_id() is not null);
create policy persona_tutor_write on persona_tutor
  for all using (app.current_user_id() is not null)
  with check (app.current_user_id() is not null);

alter table logros enable row level security;
alter table logros force row level security;
create policy logros_select on logros
  for select using (app.current_user_id() is not null);
create policy logros_write on logros
  for all using (app.current_user_id() is not null)
  with check (app.current_user_id() is not null);

-- ============================ CATÁLOGO FEMEPASHIDI =========================
-- Lectura para autenticados; escritura solo super_admin.
do $$
declare t text;
begin
  foreach t in array array[
    'temporadas','niveles','niveles_programa','elementos_examen',
    'clases_edad_adulto','reglas_permanencia'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('alter table %I force row level security;', t);
    execute format(
      'create policy %I on %I for select using (app.current_user_id() is not null);',
      t || '_select', t);
    execute format(
      'create policy %I on %I for all using (app.is_super_admin()) with check (app.is_super_admin());',
      t || '_admin', t);
  end loop;
end;
$$;

-- ============================ TABLAS CON tenant_id =========================
-- Aislamiento estricto: solo filas de los tenants del usuario.
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
    execute format('alter table %I enable row level security;', t);
    execute format('alter table %I force row level security;', t);
    -- SELECT: la fila pertenece a un tenant del usuario.
    execute format(
      'create policy %I on %I for select using (app.is_member(tenant_id));',
      t || '_select', t);
    -- INSERT: solo puede crear filas en sus tenants.
    execute format(
      'create policy %I on %I for insert with check (app.is_member(tenant_id));',
      t || '_insert', t);
    -- UPDATE: solo filas de sus tenants (y no puede moverlas a otro tenant).
    execute format(
      'create policy %I on %I for update using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));',
      t || '_update', t);
    -- DELETE: solo filas de sus tenants.
    execute format(
      'create policy %I on %I for delete using (app.is_member(tenant_id));',
      t || '_delete', t);
  end loop;
end;
$$;

-- ============================ CONSENTIMIENTOS (global) =====================
-- Ligados a persona (global). Lectura para autenticados; escritura idem.
alter table consentimientos enable row level security;
alter table consentimientos force row level security;
create policy consentimientos_select on consentimientos
  for select using (app.current_user_id() is not null);
create policy consentimientos_write on consentimientos
  for all using (app.current_user_id() is not null)
  with check (app.current_user_id() is not null);
