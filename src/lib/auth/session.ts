// Sesión real basada en Supabase Auth. Resuelve el usuario autenticado y su
// rol/tenant a partir de la tabla `memberships` (protegida por RLS).
import "server-only";
import { cache } from "react";
import type { RolApp, Sesion } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { normalizarTema } from "@/lib/temas";

// Prioridad de rol cuando un usuario tiene varias membresías activas.
// El rol de mayor prioridad decide el panel de inicio.
const PRIORIDAD_ROL: Record<RolApp, number> = {
  super_admin: 5,
  maestra: 4,
  coach_asistente: 3,
  tutor: 2,
  alumna: 1,
};

interface MembershipRow {
  rol: RolApp;
  tenant_id: string;
  tenants: { nombre: string } | null;
}

/**
 * Lee la sesión actual desde Supabase Auth. `cache()` evita repetir la consulta
 * dentro de un mismo render (layout + página). null si no hay sesión válida.
 */
export const getSesion = cache(async (): Promise<Sesion | null> => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Membresías activas del usuario y su preferencia de tema (RLS: cada quien ve
  // lo suyo). Se piden en paralelo para no encadenar round-trips.
  const [membershipsRes, appUserRes] = await Promise.all([
    supabase
      .from("memberships")
      .select("rol, tenant_id, tenants(nombre)")
      .eq("app_user_id", user.id)
      .eq("activo", true),
    supabase.from("app_users").select("tema").eq("id", user.id).maybeSingle(),
  ]);

  const filas = (membershipsRes.data ?? []) as unknown as MembershipRow[];
  const tema = normalizarTema(
    (appUserRes.data as { tema?: string } | null)?.tema,
  );

  // Sin membresía: usuario autenticado pero sin acceso asignado todavía.
  if (filas.length === 0) return null;

  // Elegir la membresía de mayor prioridad de rol.
  const principal = filas.reduce((mejor, actual) =>
    PRIORIDAD_ROL[actual.rol] > PRIORIDAD_ROL[mejor.rol] ? actual : mejor,
  );

  const nombre =
    (user.user_metadata?.nombre as string | undefined) ??
    user.email ??
    "Usuario";

  // tutor/alumna no gestionan un tenant propio en la UI.
  const esCoach =
    principal.rol === "super_admin" ||
    principal.rol === "maestra" ||
    principal.rol === "coach_asistente";

  return {
    userId: user.id,
    nombre,
    email: user.email ?? "",
    rol: principal.rol,
    tenantId: esCoach ? principal.tenant_id : null,
    tenantNombre: esCoach ? (principal.tenants?.nombre ?? null) : null,
    tema,
  };
});

/** Ruta de inicio según el rol. */
export function rutaInicioPorRol(rol: RolApp): string {
  switch (rol) {
    case "super_admin":
    case "maestra":
    case "coach_asistente":
      return "/maestra";
    case "tutor":
      return "/tutor";
    case "alumna":
      return "/alumna";
  }
}
