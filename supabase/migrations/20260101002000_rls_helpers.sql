-- =============================================================================
-- 20260101002000_rls_helpers.sql
-- Funciones de contexto para RLS. Leen auth.uid() y derivan tenants/roles.
-- SECURITY DEFINER para poder consultar memberships sin recursión de RLS.
-- =============================================================================

-- Usuario actual (auth.uid()). Devuelve null si no hay sesión.
create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
    ''
  )::uuid;
$$;

comment on function app.current_user_id is 'UUID del usuario autenticado (sub del JWT).';

-- ¿Es super_admin? (rol global; ve todo).
create or replace function app.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from memberships m
    where m.app_user_id = app.current_user_id()
      and m.rol = 'super_admin'
      and m.activo
  );
$$;

comment on function app.is_super_admin is 'true si el usuario tiene rol super_admin activo.';

-- Conjunto de tenants a los que pertenece el usuario (membership activo).
create or replace function app.current_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, app
as $$
  select m.tenant_id
  from memberships m
  where m.app_user_id = app.current_user_id()
    and m.activo;
$$;

comment on function app.current_tenant_ids is
  'Tenants con membership activo del usuario actual. Base del aislamiento RLS.';

-- ¿El usuario es miembro del tenant dado?
create or replace function app.is_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.is_super_admin() or exists (
    select 1
    from memberships m
    where m.app_user_id = app.current_user_id()
      and m.tenant_id = p_tenant_id
      and m.activo
  );
$$;

comment on function app.is_member is 'true si el usuario pertenece al tenant (o es super_admin).';

-- ¿El usuario tiene un rol específico en el tenant?
create or replace function app.has_role(p_tenant_id uuid, p_rol rol_app)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.is_super_admin() or exists (
    select 1
    from memberships m
    where m.app_user_id = app.current_user_id()
      and m.tenant_id = p_tenant_id
      and m.rol = p_rol
      and m.activo
  );
$$;

comment on function app.has_role is 'true si el usuario tiene el rol dado en el tenant.';
