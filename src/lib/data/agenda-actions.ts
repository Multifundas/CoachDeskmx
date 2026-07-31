"use server";

// Server Actions de la Agenda: crear/editar/cancelar clases (con recurrencia
// semanal) y marcar asistencia. El tenant_id sale de la sesión y RLS valida
// is_member(tenant_id). Las horas locales de la sede se convierten a UTC.
import { revalidatePath } from "next/cache";
import type {
  DiaSemana,
  EstadoAsistencia,
  TipoEvento,
} from "@/types/domain";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  construirRRULE,
  expandirSemanal,
  horaLocalAUtc,
  nuevoUidEvento,
} from "@/lib/agenda-tz";
import { TZ_DEFAULT } from "@/lib/data/agenda";
import { calcularCargoClase } from "@/lib/data/precios-clase";

export interface AgendaState {
  error: string | null;
  ok: boolean;
}

const TIPOS: TipoEvento[] = ["clase", "competencia", "examen", "evento", "otro"];
const ESTADOS_ASIS: EstadoAsistencia[] = [
  "presente",
  "ausente",
  "justificada",
  "sin_marcar",
];

function limpiar(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function esTipo(v: string): v is TipoEvento {
  return (TIPOS as string[]).includes(v);
}

// Días marcados en el form como 'dias' (múltiples checkboxes 0-6).
function diasDesdeForm(formData: FormData): DiaSemana[] {
  const out: DiaSemana[] = [];
  for (const v of formData.getAll("dias")) {
    const n = Number(v);
    if (n >= 0 && n <= 6) out.push(n as DiaSemana);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

// Resuelve la zona horaria de la sede elegida (o default del tenant).
async function tzDeSede(sedeId: string | null): Promise<string> {
  if (!sedeId) return TZ_DEFAULT;
  const supabase = createClient();
  const { data } = await supabase
    .from("sedes")
    .select("timezone")
    .eq("id", sedeId)
    .maybeSingle();
  return (data as { timezone?: string } | null)?.timezone ?? TZ_DEFAULT;
}

/**
 * Crea una clase (o evento). Si se marcan días, es recurrente semanal: se
 * inserta el evento con rrule y se materializan sus ocurrencias entre la fecha
 * de inicio y la fecha fin. Si no, es un evento único en la fecha dada.
 */
export async function crearClase(
  _prev: AgendaState,
  formData: FormData,
): Promise<AgendaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const titulo = limpiar(formData, "titulo");
  const tipoRaw = limpiar(formData, "tipo") || "clase";
  const sedeId = limpiar(formData, "sede_id") || null;
  // Concepto de referencia opcional (informativo, no cambia el cálculo del cargo).
  const conceptoId = limpiar(formData, "concepto_id") || null;
  const fechaInicio = limpiar(formData, "fecha_inicio");
  const horaInicio = limpiar(formData, "hora_inicio");
  const horaFin = limpiar(formData, "hora_fin");
  const recurrente = limpiar(formData, "recurrente") === "on";
  const fechaFin = limpiar(formData, "fecha_fin");
  const dias = diasDesdeForm(formData);

  if (titulo.length < 2) {
    return { error: "El título es obligatorio.", ok: false };
  }
  if (!esTipo(tipoRaw)) {
    return { error: "Tipo de evento inválido.", ok: false };
  }
  if (!fechaInicio || !horaInicio || !horaFin) {
    return { error: "Fecha y horario son obligatorios.", ok: false };
  }
  if (horaFin <= horaInicio) {
    return { error: "La hora de fin debe ser mayor a la de inicio.", ok: false };
  }
  if (recurrente && dias.length === 0) {
    return { error: "Elige al menos un día para la serie.", ok: false };
  }
  if (recurrente && !fechaFin) {
    return { error: "Indica hasta qué fecha se repite la serie.", ok: false };
  }
  if (recurrente && fechaFin < fechaInicio) {
    return { error: "La fecha fin no puede ser antes del inicio.", ok: false };
  }

  const timeZone = await tzDeSede(sedeId);
  const supabase = createClient();

  // Ocurrencias a materializar (UTC).
  const ocurrencias = recurrente
    ? expandirSemanal({
        fechaInicioISO: fechaInicio,
        fechaFinISO: fechaFin,
        dias,
        horaInicio,
        horaFin,
        timeZone,
      })
    : [
        {
          inicioUtc: horaLocalAUtc(fechaInicio, horaInicio, timeZone).toISOString(),
          finUtc: horaLocalAUtc(fechaInicio, horaFin, timeZone).toISOString(),
        },
      ];

  if (ocurrencias.length === 0) {
    return { error: "No se generó ninguna clase con esos datos.", ok: false };
  }

  const primera = ocurrencias[0]!;
  const ultima = ocurrencias[ocurrencias.length - 1]!;
  const rrule = recurrente ? construirRRULE(dias, fechaFin) : null;

  // 1) Evento (cabecera). inicio/fin_utc = primera ocurrencia.
  const { data: evento, error: errEvento } = await supabase
    .from("eventos")
    .insert({
      tenant_id: sesion.tenantId,
      sede_id: sedeId,
      concepto_id: conceptoId,
      tipo: tipoRaw,
      titulo,
      inicio_utc: primera.inicioUtc,
      fin_utc: recurrente ? ultima.finUtc : primera.finUtc,
      rrule,
      uid: nuevoUidEvento(),
    })
    .select("id")
    .single();

  if (errEvento || !evento) {
    return { error: "No se pudo crear la clase. Inténtalo de nuevo.", ok: false };
  }

  // 2) Ocurrencias materializadas (unique (evento_id, inicio_utc)).
  const filas = ocurrencias.map((o) => ({
    tenant_id: sesion.tenantId,
    evento_id: evento.id,
    inicio_utc: o.inicioUtc,
    fin_utc: o.finUtc,
  }));
  const { error: errOc } = await supabase
    .from("evento_ocurrencias")
    .insert(filas);

  if (errOc) {
    // Revertir el evento huérfano.
    await supabase.from("eventos").delete().eq("id", evento.id);
    return { error: "No se pudieron generar las clases.", ok: false };
  }

  revalidatePath("/maestra/agenda");
  return { error: null, ok: true };
}

/**
 * Edita una clase. Alcance "una" cambia solo la ocurrencia (reprograma su
 * horario ese día); "serie" cambia título/tipo/sede del evento completo.
 */
export async function editarClase(
  _prev: AgendaState,
  formData: FormData,
): Promise<AgendaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const eventoId = limpiar(formData, "evento_id");
  const ocurrenciaId = limpiar(formData, "ocurrencia_id");
  const alcance = limpiar(formData, "alcance"); // "una" | "serie"
  const titulo = limpiar(formData, "titulo");
  const tipoRaw = limpiar(formData, "tipo") || "clase";
  const fecha = limpiar(formData, "fecha");
  const horaInicio = limpiar(formData, "hora_inicio");
  const horaFin = limpiar(formData, "hora_fin");

  if (!eventoId || (alcance !== "una" && alcance !== "serie")) {
    return { error: "Datos inválidos.", ok: false };
  }
  if (titulo.length < 2 || !esTipo(tipoRaw)) {
    return { error: "Título o tipo inválidos.", ok: false };
  }

  const supabase = createClient();

  if (alcance === "serie") {
    const { error } = await supabase
      .from("eventos")
      .update({ titulo, tipo: tipoRaw })
      .eq("id", eventoId);
    if (error) return { error: "No se pudo actualizar la serie.", ok: false };
    revalidatePath("/maestra/agenda");
    return { error: null, ok: true };
  }

  // alcance === "una": reprograma la ocurrencia concreta.
  if (!ocurrenciaId || !fecha || !horaInicio || !horaFin) {
    return { error: "Faltan datos para reprogramar la clase.", ok: false };
  }
  if (horaFin <= horaInicio) {
    return { error: "La hora de fin debe ser mayor a la de inicio.", ok: false };
  }

  // Necesitamos la TZ de la sede del evento.
  const { data: ev } = await supabase
    .from("eventos")
    .select("sede_id, sede:sedes(timezone)")
    .eq("id", eventoId)
    .maybeSingle();
  const timeZone =
    (ev as { sede?: { timezone?: string } } | null)?.sede?.timezone ??
    TZ_DEFAULT;

  const inicioUtc = horaLocalAUtc(fecha, horaInicio, timeZone).toISOString();
  const finUtc = horaLocalAUtc(fecha, horaFin, timeZone).toISOString();

  const { error } = await supabase
    .from("evento_ocurrencias")
    .update({ inicio_utc: inicioUtc, fin_utc: finUtc })
    .eq("id", ocurrenciaId);
  if (error) return { error: "No se pudo reprogramar la clase.", ok: false };

  revalidatePath("/maestra/agenda");
  return { error: null, ok: true };
}

/**
 * Cancela una clase. Alcance "una" marca la ocurrencia como cancelada; "serie"
 * cancela el evento y todas sus ocurrencias.
 */
export async function cancelarClase(
  _prev: AgendaState,
  formData: FormData,
): Promise<AgendaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const eventoId = limpiar(formData, "evento_id");
  const ocurrenciaId = limpiar(formData, "ocurrencia_id");
  const alcance = limpiar(formData, "alcance");

  const supabase = createClient();

  if (alcance === "serie") {
    if (!eventoId) return { error: "Datos inválidos.", ok: false };
    const { error: e1 } = await supabase
      .from("eventos")
      .update({ estado: "cancelado" })
      .eq("id", eventoId);
    const { error: e2 } = await supabase
      .from("evento_ocurrencias")
      .update({ estado: "cancelado" })
      .eq("evento_id", eventoId);
    if (e1 || e2) return { error: "No se pudo cancelar la serie.", ok: false };
  } else {
    if (!ocurrenciaId) return { error: "Datos inválidos.", ok: false };
    const { error } = await supabase
      .from("evento_ocurrencias")
      .update({ estado: "cancelado" })
      .eq("id", ocurrenciaId);
    if (error) return { error: "No se pudo cancelar la clase.", ok: false };
  }

  revalidatePath("/maestra/agenda");
  return { error: null, ok: true };
}

/**
 * Reactiva una clase cancelada (vuelve a 'activo'). Alcance "una" reactiva la
 * ocurrencia; si su evento padre estaba cancelado (serie completa), también lo
 * reactiva para que la ocurrencia no quede oculta en el feed. Alcance "serie"
 * reactiva el evento y todas sus ocurrencias.
 */
export async function reactivarClase(
  _prev: AgendaState,
  formData: FormData,
): Promise<AgendaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const eventoId = limpiar(formData, "evento_id");
  const ocurrenciaId = limpiar(formData, "ocurrencia_id");
  const alcance = limpiar(formData, "alcance");

  const supabase = createClient();

  if (alcance === "serie") {
    if (!eventoId) return { error: "Datos inválidos.", ok: false };
    const { error: e1 } = await supabase
      .from("eventos")
      .update({ estado: "activo" })
      .eq("id", eventoId);
    const { error: e2 } = await supabase
      .from("evento_ocurrencias")
      .update({ estado: "activo" })
      .eq("evento_id", eventoId);
    if (e1 || e2) return { error: "No se pudo reactivar la serie.", ok: false };
  } else {
    if (!ocurrenciaId) return { error: "Datos inválidos.", ok: false };
    const { error } = await supabase
      .from("evento_ocurrencias")
      .update({ estado: "activo" })
      .eq("id", ocurrenciaId);
    if (error) return { error: "No se pudo reactivar la clase.", ok: false };
    // Si el evento padre estaba cancelado, reactivarlo para no ocultar esta
    // ocurrencia en el feed (donde evento cancelado ⇒ ocurrencia cancelada).
    if (eventoId) {
      await supabase
        .from("eventos")
        .update({ estado: "activo" })
        .eq("id", eventoId)
        .eq("estado", "cancelado");
    }
  }

  revalidatePath("/maestra/agenda");
  return { error: null, ok: true };
}

/**
 * Marca la asistencia de una alumna en una ocurrencia (upsert por
 * (ocurrencia_id, inscripcion_id)).
 */
export async function marcarAsistencia(
  _prev: AgendaState,
  formData: FormData,
): Promise<AgendaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const ocurrenciaId = limpiar(formData, "ocurrencia_id");
  const inscripcionId = limpiar(formData, "inscripcion_id");
  const estado = limpiar(formData, "estado");

  if (!ocurrenciaId || !inscripcionId) {
    return { error: "Datos inválidos.", ok: false };
  }
  if (!(ESTADOS_ASIS as string[]).includes(estado)) {
    return { error: "Estado de asistencia inválido.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("asistencias").upsert(
    {
      tenant_id: sesion.tenantId,
      ocurrencia_id: ocurrenciaId,
      inscripcion_id: inscripcionId,
      estado,
      marcado_at_utc:
        estado === "sin_marcar" ? null : new Date().toISOString(),
    },
    { onConflict: "ocurrencia_id,inscripcion_id" },
  );

  if (error) return { error: "No se pudo guardar la asistencia.", ok: false };

  // Cargo automático de clase: 'presente' genera/reactiva un cargo; cualquier
  // otro estado lo cancela. Falla suave: no bloquea la asistencia ya guardada.
  await sincronizarCargoClase(
    supabase,
    sesion.tenantId,
    ocurrenciaId,
    inscripcionId,
    estado,
  );

  revalidatePath("/maestra/agenda");
  revalidatePath("/maestra/cobranza");
  return { error: null, ok: true };
}

/**
 * Marca 'presente' en bloque a las alumnas indicadas (por inscripcion_id) que
 * aún están 'sin_marcar' en la ocurrencia. Se usa por el botón "Marcar todas
 * presentes" cuando el tenant tiene asistencia_default='presente': el estado se
 * pre-selecciona en la UI, pero el cargo solo se materializa aquí (nunca en el
 * render). Cada fila dispara sincronizarCargoClase para generar el cargo.
 */
export async function marcarTodasPresentes(
  _prev: AgendaState,
  formData: FormData,
): Promise<AgendaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const ocurrenciaId = limpiar(formData, "ocurrencia_id");
  const inscripcionIds = formData
    .getAll("inscripcion_id")
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (!ocurrenciaId || inscripcionIds.length === 0) {
    return { error: "No hay alumnas por marcar.", ok: false };
  }

  const supabase = createClient();
  const ahora = new Date().toISOString();
  const { error } = await supabase.from("asistencias").upsert(
    inscripcionIds.map((inscripcionId) => ({
      tenant_id: sesion.tenantId,
      ocurrencia_id: ocurrenciaId,
      inscripcion_id: inscripcionId,
      estado: "presente" as EstadoAsistencia,
      marcado_at_utc: ahora,
    })),
    { onConflict: "ocurrencia_id,inscripcion_id" },
  );

  if (error) return { error: "No se pudo guardar la asistencia.", ok: false };

  // Cargo automático por cada alumna marcada (falla suave, no bloquea).
  for (const inscripcionId of inscripcionIds) {
    await sincronizarCargoClase(
      supabase,
      sesion.tenantId,
      ocurrenciaId,
      inscripcionId,
      "presente",
    );
  }

  revalidatePath("/maestra/agenda");
  revalidatePath("/maestra/cobranza");
  return { error: null, ok: true };
}

/**
 * Sincroniza el cargo de clase con la asistencia de una alumna en una ocurrencia.
 * - estado 'presente': calcula la tarifa por sede+horario y crea (o reactiva) el
 *   cargo (origen 'clase'). Idempotente por el índice parcial
 *   (ocurrencia_id, inscripcion_id) where origen='clase'.
 * - otro estado: cancela el cargo automático si existe y es mutable.
 * No lanza: cualquier error se ignora (la asistencia ya quedó guardada).
 */
async function sincronizarCargoClase(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  ocurrenciaId: string,
  inscripcionId: string,
  estado: string,
): Promise<void> {
  // Buscar el cargo automático existente para esta ocurrencia+alumna.
  const { data: cargoExistente } = await supabase
    .from("cargos")
    .select("id, estado, estado_cuenta_id")
    .eq("ocurrencia_id", ocurrenciaId)
    .eq("inscripcion_id", inscripcionId)
    .eq("origen", "clase")
    .maybeSingle();

  if (estado !== "presente") {
    // Cancelar el cargo si existe, no está en corte y no tiene pagos aplicados.
    if (!cargoExistente) return;
    if (cargoExistente.estado_cuenta_id) return; // congelado en corte
    const { count } = await supabase
      .from("pagos_aplicaciones")
      .select("id", { count: "exact", head: true })
      .eq("cargo_id", cargoExistente.id);
    if (count && count > 0) return; // ya tiene pagos
    await supabase
      .from("cargos")
      .update({ estado: "cancelado" })
      .eq("id", cargoExistente.id);
    return;
  }

  // estado === 'presente': cargar la ocurrencia con su sede para calcular tarifa.
  const { data: ocur } = await supabase
    .from("evento_ocurrencias")
    .select(
      "inicio_utc, fin_utc, eventos!inner(sede_id, sedes(timezone))",
    )
    .eq("id", ocurrenciaId)
    .maybeSingle();

  if (!ocur) return;

  interface OcurJoin {
    inicio_utc: string;
    fin_utc: string;
    eventos: {
      sede_id: string | null;
      sedes: { timezone: string } | null;
    } | null;
  }
  const o = ocur as unknown as OcurJoin;
  const sedeId = o.eventos?.sede_id ?? null;
  const timezoneSede = o.eventos?.sedes?.timezone ?? TZ_DEFAULT;

  const tarifa = await calcularCargoClase({
    sedeId,
    inicioUtc: o.inicio_utc,
    finUtc: o.fin_utc,
    timezoneSede,
  });
  if (!tarifa) return; // sin tarifa configurada → sin cargo (aviso no bloqueante)

  // Concepto por clave (para concepto_id del cargo).
  const { data: concepto } = await supabase
    .from("conceptos")
    .select("id")
    .eq("clave", tarifa.conceptoClave)
    .maybeSingle();
  const conceptoId = concepto?.id ?? null;

  const periodo = o.inicio_utc.slice(0, 7); // 'YYYY-MM'

  if (cargoExistente) {
    if (cargoExistente.estado_cuenta_id) return; // congelado en corte, no tocar
    await supabase
      .from("cargos")
      .update({
        estado: "pendiente",
        monto: tarifa.monto,
        concepto_id: conceptoId,
        periodo,
      })
      .eq("id", cargoExistente.id);
    return;
  }

  await supabase.from("cargos").insert({
    tenant_id: tenantId,
    inscripcion_id: inscripcionId,
    ocurrencia_id: ocurrenciaId,
    concepto_id: conceptoId,
    monto: tarifa.monto,
    periodo,
    origen: "clase",
    estado: "pendiente",
  });
}
