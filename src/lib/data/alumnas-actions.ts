"use server";

// Server Actions para gestión de alumnas (personas + inscripciones).
// El tenant_id se obtiene de la sesión y RLS valida is_member(tenant_id) al
// insertar/actualizar inscripciones. La ficha ampliada (contacto, tutor,
// emergencia) es privada por maestra y vive en inscripciones.
import { revalidatePath } from "next/cache";
import type {
  EstadoInscripcion,
  Parentesco,
  SexoPersona,
} from "@/types/domain";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface AlumnaFormState {
  error: string | null;
  ok: boolean;
}

const ESTADOS: EstadoInscripcion[] = ["activa", "pausada", "baja"];
const SEXOS: SexoPersona[] = ["f", "m", "x"];
const PARENTESCOS: Parentesco[] = [
  "madre",
  "padre",
  "tutor_legal",
  "abuelo",
  "otro",
  "la_misma",
];

function esEstado(v: string): v is EstadoInscripcion {
  return (ESTADOS as string[]).includes(v);
}

function limpiar(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Convierte un valor de enum opcional del form a su tipo o null.
function opcionEnum<T extends string>(valor: string, permitidos: T[]): T | null {
  return (permitidos as string[]).includes(valor) ? (valor as T) : null;
}

// Campos de la ficha ampliada (compartidos entre alta y edición).
function fichaDesdeForm(formData: FormData) {
  return {
    telefono_alumna: limpiar(formData, "telefono_alumna") || null,
    sexo: opcionEnum(limpiar(formData, "sexo"), SEXOS),
    club: limpiar(formData, "club") || null,
    tutor_nombre: limpiar(formData, "tutor_nombre") || null,
    tutor_telefono: limpiar(formData, "tutor_telefono") || null,
    tutor_email: limpiar(formData, "tutor_email") || null,
    tutor_parentesco: opcionEnum(limpiar(formData, "tutor_parentesco"), PARENTESCOS),
    emergencia_nombre: limpiar(formData, "emergencia_nombre") || null,
    emergencia_telefono: limpiar(formData, "emergencia_telefono") || null,
    notas_medicas: limpiar(formData, "notas_medicas") || null,
  };
}

/**
 * Alta de una alumna: crea la persona (identidad) y su inscripción con la
 * maestra (tenant de la sesión), incluyendo la ficha ampliada.
 */
export async function crearAlumna(
  _prev: AlumnaFormState,
  formData: FormData,
): Promise<AlumnaFormState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const nombre = limpiar(formData, "nombre");
  const apellidos = limpiar(formData, "apellidos");
  const fechaNacimiento = limpiar(formData, "fecha_nacimiento");
  const nivelId = limpiar(formData, "nivel_actual_id");
  const estado = limpiar(formData, "estado") || "activa";

  if (nombre.length < 2 || apellidos.length < 2) {
    return { error: "Nombre y apellidos son obligatorios.", ok: false };
  }
  if (!esEstado(estado)) {
    return { error: "Estado inválido.", ok: false };
  }

  const supabase = createClient();

  // 1) Persona (identidad).
  const { data: persona, error: errPersona } = await supabase
    .from("personas")
    .insert({
      nombre,
      apellidos,
      fecha_nacimiento: fechaNacimiento || null,
      nivel_actual_id: nivelId || null,
    })
    .select("id")
    .single();

  if (errPersona || !persona) {
    return { error: "No se pudo crear la alumna. Inténtalo de nuevo.", ok: false };
  }

  // 2) Inscripción (por tenant) con ficha. RLS valida is_member(tenant_id).
  const { error: errInsc } = await supabase.from("inscripciones").insert({
    tenant_id: sesion.tenantId,
    persona_id: persona.id,
    estado,
    ...fichaDesdeForm(formData),
  });

  if (errInsc) {
    // Revertir la persona huérfana creada en el paso 1.
    await supabase.from("personas").delete().eq("id", persona.id);
    return { error: "No se pudo crear la inscripción. Inténtalo de nuevo.", ok: false };
  }

  revalidatePath("/maestra/alumnas");
  return { error: null, ok: true };
}

export interface ImportState {
  error: string | null;
  ok: boolean;
  creadas?: number;
  fallidas?: number;
  detalleFallidas?: string[];
}

// Fila normalizada del CSV que envía el cliente (ya parseada). Solo nombre y
// apellidos son obligatorios; el resto es opcional.
interface FilaImport {
  nombre?: string;
  apellidos?: string;
  fecha_nacimiento?: string;
  telefono_alumna?: string;
  sexo?: string;
  club?: string;
  tutor_nombre?: string;
  tutor_telefono?: string;
  tutor_email?: string;
  tutor_parentesco?: string;
  emergencia_nombre?: string;
  emergencia_telefono?: string;
  notas_medicas?: string;
}

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Carga masiva de alumnas desde un CSV (parseado en el cliente y enviado como
 * JSON en el campo `filas`). Inserta persona + inscripción por fila, igual que
 * el alta individual. Continúa ante errores por fila y reporta cuántas se
 * crearon y cuáles fallaron. Fecha de nacimiento esperada en formato ISO
 * (aaaa-mm-dd); las demás columnas son texto libre opcional.
 */
export async function importarAlumnasCsv(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  let filas: FilaImport[];
  try {
    const raw = String(formData.get("filas") ?? "[]");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("no-array");
    filas = parsed as FilaImport[];
  } catch {
    return { error: "No se pudo leer el archivo. Revisa el formato.", ok: false };
  }

  if (filas.length === 0) {
    return { error: "El archivo no tiene filas para importar.", ok: false };
  }
  if (filas.length > 500) {
    return { error: "Máximo 500 alumnas por carga.", ok: false };
  }

  const supabase = createClient();
  let creadas = 0;
  const detalleFallidas: string[] = [];

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i]!;
    const nombre = texto(f.nombre);
    const apellidos = texto(f.apellidos);
    const etiqueta = `Fila ${i + 2}${nombre || apellidos ? ` (${nombre} ${apellidos})`.trim() : ""}`;

    if (nombre.length < 2 || apellidos.length < 2) {
      detalleFallidas.push(`${etiqueta}: nombre y apellidos son obligatorios.`);
      continue;
    }

    const { data: persona, error: errPersona } = await supabase
      .from("personas")
      .insert({
        nombre,
        apellidos,
        fecha_nacimiento: texto(f.fecha_nacimiento) || null,
      })
      .select("id")
      .single();

    if (errPersona || !persona) {
      detalleFallidas.push(`${etiqueta}: no se pudo crear la persona.`);
      continue;
    }

    const { error: errInsc } = await supabase.from("inscripciones").insert({
      tenant_id: sesion.tenantId,
      persona_id: persona.id,
      estado: "activa",
      telefono_alumna: texto(f.telefono_alumna) || null,
      sexo: opcionEnum(texto(f.sexo).toLowerCase(), SEXOS),
      club: texto(f.club) || null,
      tutor_nombre: texto(f.tutor_nombre) || null,
      tutor_telefono: texto(f.tutor_telefono) || null,
      tutor_email: texto(f.tutor_email) || null,
      tutor_parentesco: opcionEnum(
        texto(f.tutor_parentesco).toLowerCase(),
        PARENTESCOS,
      ),
      emergencia_nombre: texto(f.emergencia_nombre) || null,
      emergencia_telefono: texto(f.emergencia_telefono) || null,
      notas_medicas: texto(f.notas_medicas) || null,
    });

    if (errInsc) {
      // Revertir la persona huérfana.
      await supabase.from("personas").delete().eq("id", persona.id);
      detalleFallidas.push(`${etiqueta}: no se pudo crear la inscripción.`);
      continue;
    }

    creadas++;
  }

  if (creadas > 0) revalidatePath("/maestra/alumnas");

  return {
    error: null,
    ok: true,
    creadas,
    fallidas: detalleFallidas.length,
    detalleFallidas,
  };
}

/**
 * Actualiza la ficha de una inscripción (estado, notas y contacto). También
 * actualiza el nivel y la fecha de nacimiento en la persona. Si el estado pasa
 * a 'baja' se registra fecha_baja; en otro caso se limpia.
 */
export async function actualizarInscripcion(
  _prev: AlumnaFormState,
  formData: FormData,
): Promise<AlumnaFormState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const inscripcionId = limpiar(formData, "inscripcion_id");
  const personaId = limpiar(formData, "persona_id");
  const estado = limpiar(formData, "estado");
  const notas = limpiar(formData, "notas_privadas");
  const nivelId = limpiar(formData, "nivel_actual_id");
  const fechaNacimiento = limpiar(formData, "fecha_nacimiento");

  if (!inscripcionId || !esEstado(estado)) {
    return { error: "Datos inválidos.", ok: false };
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("inscripciones")
    .update({
      estado,
      notas_privadas: notas || null,
      fecha_baja: estado === "baja" ? new Date().toISOString().slice(0, 10) : null,
      ...fichaDesdeForm(formData),
    })
    .eq("id", inscripcionId);

  if (error) {
    return { error: "No se pudo guardar el cambio.", ok: false };
  }

  // Nivel y fecha de nacimiento viven en la persona (identidad).
  if (personaId) {
    await supabase
      .from("personas")
      .update({
        nivel_actual_id: nivelId || null,
        fecha_nacimiento: fechaNacimiento || null,
      })
      .eq("id", personaId);
  }

  revalidatePath("/maestra/alumnas");
  return { error: null, ok: true };
}
