import "server-only";

// Config a nivel tenant que vive en la propia fila de `tenants` (no hay tabla
// tenant_config). Por ahora: el modo de asistencia por defecto de la agenda.
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AsistenciaDefault = "sin_marcar" | "presente";

/**
 * Modo de asistencia por defecto del tenant de la sesión.
 * - 'sin_marcar': la maestra confirma cada alumna (comportamiento por defecto).
 * - 'presente': pre-selecciona presente; solo se marcan las excepciones.
 * Ante cualquier fallo o sesión sin tenant, cae a 'sin_marcar' (seguro).
 */
export async function obtenerAsistenciaDefault(): Promise<AsistenciaDefault> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) return "sin_marcar";

  const supabase = createClient();
  const { data } = await supabase
    .from("tenants")
    .select("asistencia_default")
    .eq("id", sesion.tenantId)
    .maybeSingle();

  return data?.asistencia_default === "presente" ? "presente" : "sin_marcar";
}
