# Conexión a Supabase (nube) + Magic Link

Guía para conectar CoachDeskmx a un proyecto real de Supabase con
autenticación por **enlace mágico** (magic link / OTP por correo).

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Copia de **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secreta) → `SUPABASE_SERVICE_ROLE_KEY`
3. Crea `.env.local` a partir de `.env.example` y pega los valores.

## 2. Aplicar el esquema (migraciones + seeds)

Opción A — Supabase CLI (recomendado):

```bash
supabase link --project-ref TU_REF
supabase db push          # aplica supabase/migrations/*
psql "$DATABASE_URL" -f supabase/seed.sql   # o desde el SQL Editor
```

Opción B — SQL Editor de la consola:

1. Abre **SQL Editor**.
2. Ejecuta en orden cada archivo de `supabase/migrations/` (por nombre).
3. Ejecuta el contenido de `supabase/seed.sql`.

> Las políticas RLS quedan activas (FORCE RLS). El aislamiento entre maestras
> se valida con los tests pgTAP: `supabase test db`.

## 3. Configurar Auth (magic link)

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (y tu dominio en producción).
- **Redirect URLs**: agrega `http://localhost:3000/auth/callback`
  (y `https://TU-DOMINIO/auth/callback` en producción).

En **Authentication → Providers → Email**:

- Activa **Email**.
- El flujo usa `signInWithOtp` con `shouldCreateUser: false`, es decir, solo
  entran cuentas ya dadas de alta. Los usuarios se crean por invitación (abajo).

## 4. Crear usuarios y membresías

El login **no** crea usuarios. Cada persona con acceso necesita:

1. Un usuario en `auth.users` (Authentication → **Add user** / invitación por
   correo, o `supabase.auth.admin.inviteUserByEmail`).
2. Una fila espejo en `public.app_users` (mismo `id`).
3. Una fila en `public.memberships` con `tenant_id`, `app_user_id`, `rol`.

Ejemplo (SQL Editor), asumiendo que ya existe el usuario en `auth.users`:

```sql
-- Reemplaza el UUID por el id real de auth.users.
insert into app_users (id, nombre, email)
values ('00000000-0000-0000-0000-000000000000', 'Laura Coach', 'laura@demo.mx')
on conflict (id) do nothing;

insert into memberships (tenant_id, app_user_id, rol)
values (
  'dededede-0000-4000-8000-000000000001',  -- tenant demo (seed 07)
  '00000000-0000-0000-0000-000000000000',
  'maestra'
);
```

El rol de la membresía decide el panel de inicio:

| rol                              | inicio     |
| -------------------------------- | ---------- |
| super_admin / maestra / coach_asistente | `/maestra` |
| tutor                            | `/tutor`   |
| alumna                           | `/alumna`  |

Si un usuario tiene varias membresías, gana el rol de mayor prioridad
(super_admin > maestra > coach_asistente > tutor > alumna).

## 5. Flujo de sesión

- `src/lib/supabase/middleware.ts` refresca el token en cada request y protege
  `/maestra`, `/tutor`, `/alumna`.
- `enviarMagicLink` (Server Action) manda el correo con enlace a
  `/auth/callback`.
- `/auth/callback/route.ts` hace `exchangeCodeForSession` y redirige por rol.
- `getSesion()` deriva rol/tenant desde `memberships` (con RLS).

## Pendiente

- Los dashboards (`/maestra`, `/tutor`, `/alumna`) aún leen de
  `src/lib/mock/data.ts`. El siguiente paso es reemplazar esas funciones por
  consultas reales a Supabase (con RLS aplicando el aislamiento por tenant).
