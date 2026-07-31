"use server";

// Server Actions de la sección Ajustes: apariencia (tema) y sedes (pistas).
// El tema se guarda en app_users (política app_users_self_upd permite editar la
// propia fila). Las sedes son por tenant y RLS valida is_member(tenant_id).
import { revalidatePath } from "next/cache";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { esTemaValido } from "@/lib/temas";

export interface AccionState {
  error: string | null;
  ok: boolean;
}

function limpiar(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Guarda la paleta elegida por el usuario en app_users.tema. */
export async function guardarTema(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion) {
    return { error: "Sesión no válida. Vuelve a iniciar sesión.", ok: false };
  }

  const tema = limpiar(formData, "tema");
  if (!esTemaValido(tema)) {
    return { error: "Tema no válido.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("app_users")
    .update({ tema })
    .eq("id", sesion.userId);

  if (error) {
    return { error: "No se pudo guardar el tema.", ok: false };
  }

  // El tema tiñe todo el área privada (layout), por eso se revalida la raíz.
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

// --- Asistencia por defecto (nivel tenant) -----------------------------------

/**
 * Guarda el modo de asistencia por defecto del tenant en tenants.asistencia_default.
 * 'presente' pre-selecciona a todas presentes (el cargo se materializa con el
 * botón "Marcar todas presentes"); 'sin_marcar' exige confirmación manual.
 * La política tenants_maestra_update permite el UPDATE a la maestra.
 */
export async function guardarAsistenciaDefault(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const modo = limpiar(formData, "modo");
  if (modo !== "sin_marcar" && modo !== "presente") {
    return { error: "Opción de asistencia no válida.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("tenants")
    .update({ asistencia_default: modo })
    .eq("id", sesion.tenantId);

  if (error) {
    return { error: "No se pudo guardar la preferencia.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  revalidatePath("/maestra/agenda");
  return { error: null, ok: true };
}

// --- Sedes (pistas) ----------------------------------------------------------

const TIMEZONES_MX = [
  "America/Mexico_City",
  "America/Tijuana",
  "America/Cancun",
  "America/Monterrey",
  "America/Hermosillo",
  "America/Chihuahua",
  "America/Mazatlan",
];

/** Alta de una sede (pista) para el tenant de la sesión. */
export async function crearSede(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const nombre = limpiar(formData, "nombre");
  const timezone = limpiar(formData, "timezone") || "America/Mexico_City";
  const direccion = limpiar(formData, "direccion");

  if (nombre.length < 2) {
    return { error: "El nombre de la pista es obligatorio.", ok: false };
  }
  if (!TIMEZONES_MX.includes(timezone)) {
    return { error: "Zona horaria no válida.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("sedes").insert({
    tenant_id: sesion.tenantId,
    nombre,
    timezone,
    direccion: direccion || null,
  });

  if (error) {
    return { error: "No se pudo crear la pista.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/** Edita una sede existente (nombre, timezone, dirección, activa). */
export async function editarSede(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "id");
  const nombre = limpiar(formData, "nombre");
  const timezone = limpiar(formData, "timezone") || "America/Mexico_City";
  const direccion = limpiar(formData, "direccion");
  const activa = limpiar(formData, "activa") === "true";

  if (!id) {
    return { error: "Pista no encontrada.", ok: false };
  }
  if (nombre.length < 2) {
    return { error: "El nombre de la pista es obligatorio.", ok: false };
  }
  if (!TIMEZONES_MX.includes(timezone)) {
    return { error: "Zona horaria no válida.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("sedes")
    .update({ nombre, timezone, direccion: direccion || null, activa })
    .eq("id", id);

  if (error) {
    return { error: "No se pudo guardar la pista.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/** Archiva (activa=false) una sede sin borrarla. */
export async function archivarSede(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "id");
  if (!id) {
    return { error: "Pista no encontrada.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("sedes")
    .update({ activa: false })
    .eq("id", id);

  if (error) {
    return { error: "No se pudo archivar la pista.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/**
 * Elimina una sede de forma permanente. Acción irreversible: exige confirmación
 * explícita (campo `confirmar`). Las tarifas/config/bloques de la sede se borran en
 * cascada; los eventos que la referencian conservan su historial con sede_id = null
 * (FK on delete set null).
 */
export async function eliminarSede(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "id");
  if (!id) {
    return { error: "Pista no encontrada.", ok: false };
  }
  if (limpiar(formData, "confirmar") !== "true") {
    return { error: "Confirma la eliminación para continuar.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("sedes").delete().eq("id", id);

  if (error) {
    return { error: "No se pudo eliminar la pista.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

// --- Feed ICS (calendario externo) -------------------------------------------

/**
 * Genera (o regenera) el token del feed ICS del tenant. Si ya existe una fila
 * 'ics', la reactiva con un token nuevo; si no, inserta una. Regenerar invalida
 * la URL anterior. RLS limita la fila al tenant de la sesión.
 */
export async function generarTokenFeedICS(
  _prev: AccionState,
  _formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const supabase = createClient();
  const token = crypto.randomUUID();

  const { data: existente } = await supabase
    .from("conexiones_calendario")
    .select("id")
    .eq("tipo", "ics")
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("conexiones_calendario")
      .update({ token_feed: token, estado: "activa" })
      .eq("id", existente.id);
    if (error) {
      return { error: "No se pudo generar el enlace.", ok: false };
    }
  } else {
    const { error } = await supabase.from("conexiones_calendario").insert({
      tenant_id: sesion.tenantId,
      tipo: "ics",
      token_feed: token,
      estado: "activa",
    });
    if (error) {
      return { error: "No se pudo generar el enlace.", ok: false };
    }
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/**
 * Revoca el feed ICS: marca la conexión como revocada y borra el token (la URL
 * deja de funcionar de inmediato).
 */
export async function revocarTokenFeedICS(
  _prev: AccionState,
  _formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("conexiones_calendario")
    .update({ token_feed: null, estado: "revocada" })
    .eq("tipo", "ics");

  if (error) {
    return { error: "No se pudo revocar el enlace.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}
