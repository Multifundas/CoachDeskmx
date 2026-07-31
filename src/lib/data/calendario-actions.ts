"use server";

// Acciones para compartir el calendario de una alumna por enlace público (p. ej.
// WhatsApp). El enlace es de solo lectura y sin login: se apoya en tokens_publicos
// con recurso_tipo='inscripcion'. La resolución pública vive en tokens-publicos.ts.
import { revalidatePath } from "next/cache";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface CalState {
  error: string | null;
  ok: boolean;
  token?: string;
}

/**
 * Crea (o reutiliza) un token público para compartir el calendario de una alumna.
 * El enlace es de solo lectura y sin login. Si ya existe un token activo para esa
 * inscripción, lo reutiliza. Devuelve el token para que la UI arme la URL.
 */
export async function crearTokenCalendario(
  _prev: CalState,
  formData: FormData,
): Promise<CalState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;
  const supabase = createClient();

  const inscripcionId = String(formData.get("inscripcion_id") ?? "").trim();
  if (!inscripcionId) return { error: "Alumna no encontrada.", ok: false };

  // Verifica que la inscripción exista y sea del tenant (RLS ya lo limita).
  const { data: insc } = await supabase
    .from("inscripciones")
    .select("id")
    .eq("id", inscripcionId)
    .maybeSingle();
  if (!insc) {
    return { error: "Alumna no encontrada.", ok: false };
  }

  // Reutiliza un token activo existente para este recurso.
  const { data: existente } = await supabase
    .from("tokens_publicos")
    .select("token")
    .eq("recurso_tipo", "inscripcion")
    .eq("recurso_id", inscripcionId)
    .eq("revocado", false)
    .maybeSingle();

  if (existente?.token) {
    return { error: null, ok: true, token: existente.token };
  }

  const token = crypto.randomUUID();
  const { error } = await supabase.from("tokens_publicos").insert({
    tenant_id: tenantId,
    token,
    recurso_tipo: "inscripcion",
    recurso_id: inscripcionId,
  });
  if (error) {
    return { error: "No se pudo generar el enlace.", ok: false };
  }

  revalidatePath("/maestra/alumnas");
  return { error: null, ok: true, token };
}
