"use server";

// Acciones para el desempeño de la alumna: marcar el estado de cada elemento
// del examen (camino al próximo nivel), gestionar las tareas para la mamá, y
// generar el enlace público de solo lectura (/d/[token]). El tenant_id sale de
// la sesión y RLS valida is_member(tenant_id) al escribir.
import { revalidatePath } from "next/cache";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { EstadoElemento } from "@/lib/data/desempeno";

export interface TokenDesempState {
  error: string | null;
  ok: boolean;
  token?: string;
}

const ESTADOS: EstadoElemento[] = ["pendiente", "en_progreso", "dominado"];

function esEstado(v: string): v is EstadoElemento {
  return (ESTADOS as string[]).includes(v);
}

function limpiar(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Marca el estado (pendiente/en_progreso/dominado) de un elemento del examen
 * para una alumna. Upsert por (inscripcion_id, elemento_id). Acción directa de
 * formulario (sin estado): revalida la ficha al terminar.
 */
export async function marcarElemento(formData: FormData): Promise<void> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) return;

  const inscripcionId = limpiar(formData, "inscripcion_id");
  const elementoId = limpiar(formData, "elemento_id");
  const estado = limpiar(formData, "estado");

  if (!inscripcionId || !elementoId || !esEstado(estado)) return;

  const supabase = createClient();
  await supabase.from("desempeno_elementos").upsert(
    {
      tenant_id: sesion.tenantId,
      inscripcion_id: inscripcionId,
      elemento_id: elementoId,
      estado,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "inscripcion_id,elemento_id" },
  );

  revalidatePath("/maestra/alumnas");
}

/**
 * Crea una tarea (título + fecha límite opcional) para la mamá de la alumna.
 */
export async function crearTarea(formData: FormData): Promise<void> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) return;

  const inscripcionId = limpiar(formData, "inscripcion_id");
  const titulo = limpiar(formData, "titulo");
  const fechaLimite = limpiar(formData, "fecha_limite");

  if (!inscripcionId || titulo.length < 2) return;

  const supabase = createClient();
  await supabase.from("tareas_alumna").insert({
    tenant_id: sesion.tenantId,
    inscripcion_id: inscripcionId,
    titulo,
    fecha_limite: fechaLimite || null,
  });

  revalidatePath("/maestra/alumnas");
}

/**
 * Alterna el estado hecha/pendiente de una tarea. El formulario envía el valor
 * actual y se guarda el opuesto.
 */
export async function alternarTarea(formData: FormData): Promise<void> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) return;

  const tareaId = limpiar(formData, "tarea_id");
  const hechaActual = limpiar(formData, "hecha") === "true";
  if (!tareaId) return;

  const supabase = createClient();
  await supabase
    .from("tareas_alumna")
    .update({ hecha: !hechaActual, updated_at: new Date().toISOString() })
    .eq("id", tareaId);

  revalidatePath("/maestra/alumnas");
}

/**
 * Elimina una tarea.
 */
export async function eliminarTarea(formData: FormData): Promise<void> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) return;

  const tareaId = limpiar(formData, "tarea_id");
  if (!tareaId) return;

  const supabase = createClient();
  await supabase.from("tareas_alumna").delete().eq("id", tareaId);

  revalidatePath("/maestra/alumnas");
}

/**
 * Crea (o reutiliza) un token público para compartir el desempeño de una alumna.
 * El enlace es de solo lectura y sin login (recurso_tipo='desempeno').
 */
export async function crearTokenDesempeno(
  _prev: TokenDesempState,
  formData: FormData,
): Promise<TokenDesempState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;
  const supabase = createClient();

  const inscripcionId = limpiar(formData, "inscripcion_id");
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
    .eq("recurso_tipo", "desempeno")
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
    recurso_tipo: "desempeno",
    recurso_id: inscripcionId,
  });
  if (error) {
    return { error: "No se pudo generar el enlace.", ok: false };
  }

  revalidatePath("/maestra/alumnas");
  return { error: null, ok: true, token };
}
