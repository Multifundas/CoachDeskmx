"use server";

// Server Actions de bloques de hielo (horarios). CRUD sobre bloques_hielo; RLS
// valida is_member(tenant_id). Un bloque es recurrente (dia_semana 0-6) o puntual
// (fecha). El check de BD exige hora_fin > hora_inicio y uno de {dia_semana,fecha}.
import { revalidatePath } from "next/cache";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface AccionState {
  error: string | null;
  ok: boolean;
}

function limpiar(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Valida y normaliza los campos comunes de un bloque desde el formulario.
// Devuelve el payload listo para insert/update o un mensaje de error.
function leerCampos(
  formData: FormData,
):
  | { ok: true; valores: Record<string, unknown> }
  | { ok: false; error: string } {
  const sedeId = limpiar(formData, "sede_id");
  const modo = limpiar(formData, "modo"); // 'recurrente' | 'puntual'
  const horaInicio = limpiar(formData, "hora_inicio");
  const horaFin = limpiar(formData, "hora_fin");
  const capacidadRaw = limpiar(formData, "capacidad");

  if (!sedeId) return { ok: false, error: "Selecciona una pista." };
  if (modo !== "recurrente" && modo !== "puntual") {
    return { ok: false, error: "Elige un tipo de horario." };
  }
  if (!horaInicio || !horaFin) {
    return { ok: false, error: "Indica la hora de inicio y de fin." };
  }
  if (horaFin <= horaInicio) {
    return { ok: false, error: "La hora de fin debe ser mayor a la de inicio." };
  }

  let diaSemana: number | null = null;
  let fecha: string | null = null;
  if (modo === "recurrente") {
    const dia = Number(limpiar(formData, "dia_semana"));
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      return { ok: false, error: "Selecciona un día de la semana válido." };
    }
    diaSemana = dia;
  } else {
    fecha = limpiar(formData, "fecha");
    if (!fecha) return { ok: false, error: "Indica la fecha del bloque." };
  }

  let capacidad: number | null = null;
  if (capacidadRaw) {
    const c = Number(capacidadRaw);
    if (!Number.isInteger(c) || c < 0) {
      return { ok: false, error: "La capacidad debe ser un entero mayor o igual a 0." };
    }
    capacidad = c;
  }

  return {
    ok: true,
    valores: {
      sede_id: sedeId,
      dia_semana: diaSemana,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      capacidad,
    },
  };
}

/** Alta de un bloque de hielo para el tenant de la sesión. */
export async function crearBloque(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const parsed = leerCampos(formData);
  if (!parsed.ok) return { error: parsed.error, ok: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("bloques_hielo")
    .insert({ tenant_id: sesion.tenantId, ...parsed.valores });

  if (error) {
    return { error: "No se pudo crear el horario.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/** Edición de un bloque existente. */
export async function editarBloque(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "id");
  if (!id) return { error: "Horario no encontrado.", ok: false };

  const parsed = leerCampos(formData);
  if (!parsed.ok) return { error: parsed.error, ok: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("bloques_hielo")
    .update(parsed.valores)
    .eq("id", id);

  if (error) {
    return { error: "No se pudo guardar el horario.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/** Elimina un bloque de forma permanente. Exige confirmación explícita. */
export async function eliminarBloque(
  _prev: AccionState,
  formData: FormData,
): Promise<AccionState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "id");
  if (!id) return { error: "Horario no encontrado.", ok: false };
  if (limpiar(formData, "confirmar") !== "true") {
    return { error: "Confirma la eliminación para continuar.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("bloques_hielo").delete().eq("id", id);

  if (error) {
    return { error: "No se pudo eliminar el horario.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}
