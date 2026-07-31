"use server";

// Server Actions de Competencias:
//  - crearCompetencia: registra la competencia y crea su evento ESPEJO en la
//    Agenda (tipo 'competencia') para que aparezca en el calendario.
//  - editarCompetencia / eliminarCompetencia.
//  - inscribirAlumna: inscribe a la alumna y, en cascada (rollback manual):
//      1) fila en competencia_inscripciones,
//      2) CARGO de cuota de coacheo (origen 'competencia', estado 'pendiente',
//         periodo = mes de la competencia 'YYYY-MM'), monto según su nivel,
//      3) COACHEO: evento tipo 'evento' + ocurrencia el día de la competencia +
//         asistencia (sin_marcar) ligando a la alumna.
//  - quitarInscripcion.
//  - guardarTarifasNivel: upsert masivo de cuotas por nivel (Ajustes).
import { revalidatePath } from "next/cache";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { horaLocalAUtc, nuevoUidEvento } from "@/lib/agenda-tz";
import { TZ_DEFAULT } from "@/lib/data/agenda";

export interface CompetenciaState {
  error: string | null;
  ok: boolean;
  aviso?: string | null; // mensaje no bloqueante (p.ej. nivel sin tarifa)
}

export interface ImportState {
  error: string | null;
  ok: boolean;
  creadas?: number; // cuántas competencias se importaron
}

function limpiar(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// 'YYYY-MM' del día de la competencia (para el periodo del cargo).
function periodoDeFecha(fechaISO: string): string {
  return fechaISO.slice(0, 7);
}

// Crea una competencia (registro) + su evento ESPEJO en la Agenda con rollback
// manual. Devuelve null si todo salió bien, o un mensaje de error si algo falló.
// Reutilizado por crearCompetencia (individual) e importarCompetencias (lote).
async function crearCompetenciaConEspejo(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  temporadaId: string | null,
  datos: { nombre: string; sede: string | null; fecha: string },
): Promise<string | null> {
  // 1) Registro de la competencia.
  const { data: comp, error: errComp } = await supabase
    .from("competencias")
    .insert({
      tenant_id: tenantId,
      temporada_id: temporadaId,
      nombre: datos.nombre,
      sede: datos.sede,
      fecha: datos.fecha,
    })
    .select("id")
    .single();

  if (errComp || !comp) {
    return "No se pudo crear la competencia.";
  }

  // 2) Evento espejo (tipo 'competencia'), día completo local 08:00–20:00.
  const inicioUtc = horaLocalAUtc(datos.fecha, "08:00", TZ_DEFAULT).toISOString();
  const finUtc = horaLocalAUtc(datos.fecha, "20:00", TZ_DEFAULT).toISOString();

  const { data: evento, error: errEvento } = await supabase
    .from("eventos")
    .insert({
      tenant_id: tenantId,
      tipo: "competencia",
      titulo: datos.nombre,
      inicio_utc: inicioUtc,
      fin_utc: finUtc,
      uid: nuevoUidEvento(),
    })
    .select("id")
    .single();

  if (errEvento || !evento) {
    await supabase.from("competencias").delete().eq("id", comp.id);
    return "No se pudo agendar la competencia.";
  }

  const { error: errOc } = await supabase.from("evento_ocurrencias").insert({
    tenant_id: tenantId,
    evento_id: evento.id,
    inicio_utc: inicioUtc,
    fin_utc: finUtc,
  });

  if (errOc) {
    await supabase.from("eventos").delete().eq("id", evento.id);
    await supabase.from("competencias").delete().eq("id", comp.id);
    return "No se pudo agendar la competencia.";
  }

  return null;
}

// ---- Crear competencia (registro + evento espejo en Agenda) ----------------
export async function crearCompetencia(
  _prev: CompetenciaState,
  formData: FormData,
): Promise<CompetenciaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const nombre = limpiar(formData, "nombre");
  const sede = limpiar(formData, "sede") || null;
  const fecha = limpiar(formData, "fecha");

  if (nombre.length < 2) {
    return { error: "El nombre de la competencia es obligatorio.", ok: false };
  }
  if (!fecha) {
    return { error: "La fecha de la competencia es obligatoria.", ok: false };
  }

  const supabase = createClient();

  // Temporada activa (opcional; la competencia puede quedar sin temporada).
  const { data: temp } = await supabase
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .maybeSingle();
  const temporadaId = (temp as { id: string } | null)?.id ?? null;

  const err = await crearCompetenciaConEspejo(supabase, sesion.tenantId, temporadaId, {
    nombre,
    sede,
    fecha,
  });
  if (err) return { error: `${err} Inténtalo de nuevo.`, ok: false };

  revalidatePath("/maestra/competencias");
  revalidatePath("/maestra/agenda");
  return { error: null, ok: true };
}

// ---- Importar competencias en lote (editor del calendario) -----------------
// Lee filas indexadas del form: nombre_<i>, fecha_<i>, sede_<i>, incluir_<i>.
// Crea cada fila marcada (registro + evento espejo). No es atómico entre filas:
// cada competencia se crea o falla individualmente; se reporta el conteo.
export async function importarCompetencias(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const total = Number(limpiar(formData, "total"));
  if (!Number.isInteger(total) || total <= 0) {
    return { error: "No hay filas para importar.", ok: false };
  }

  const supabase = createClient();

  const { data: temp } = await supabase
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .maybeSingle();
  const temporadaId = (temp as { id: string } | null)?.id ?? null;

  let creadas = 0;
  let fallidas = 0;

  for (let i = 0; i < total; i++) {
    // Solo las filas cuyo checkbox "incluir_<i>" viene marcado (valor "on").
    if (limpiar(formData, `incluir_${i}`) !== "on") continue;

    const nombre = limpiar(formData, `nombre_${i}`);
    const fecha = limpiar(formData, `fecha_${i}`);
    const sede = limpiar(formData, `sede_${i}`) || null;

    // Fila incluida pero inválida: se salta y cuenta como fallida.
    if (nombre.length < 2 || !fecha) {
      fallidas++;
      continue;
    }

    const err = await crearCompetenciaConEspejo(supabase, sesion.tenantId, temporadaId, {
      nombre,
      sede,
      fecha,
    });
    if (err) {
      fallidas++;
    } else {
      creadas++;
    }
  }

  if (creadas === 0) {
    return {
      error:
        fallidas > 0
          ? "No se pudo importar ninguna fila. Revisa nombre y fecha."
          : "No seleccionaste ninguna competencia.",
      ok: false,
    };
  }

  revalidatePath("/maestra/competencias");
  revalidatePath("/maestra/agenda");
  return {
    error: fallidas > 0 ? `${fallidas} fila(s) no se pudieron importar.` : null,
    ok: true,
    creadas,
  };
}

// ---- Editar competencia (solo registro; el espejo no se re-sincroniza) -----
export async function editarCompetencia(
  _prev: CompetenciaState,
  formData: FormData,
): Promise<CompetenciaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "competencia_id");
  const nombre = limpiar(formData, "nombre");
  const sede = limpiar(formData, "sede") || null;
  const fecha = limpiar(formData, "fecha");

  if (!id) return { error: "Datos inválidos.", ok: false };
  if (nombre.length < 2) {
    return { error: "El nombre de la competencia es obligatorio.", ok: false };
  }
  if (!fecha) {
    return { error: "La fecha de la competencia es obligatoria.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("competencias")
    .update({ nombre, sede, fecha })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar la competencia.", ok: false };

  revalidatePath("/maestra/competencias");
  return { error: null, ok: true };
}

// ---- Eliminar competencia --------------------------------------------------
export async function eliminarCompetencia(
  _prev: CompetenciaState,
  formData: FormData,
): Promise<CompetenciaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "competencia_id");
  if (!id) return { error: "Datos inválidos.", ok: false };

  const supabase = createClient();
  const { error } = await supabase.from("competencias").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar la competencia.", ok: false };

  revalidatePath("/maestra/competencias");
  return { error: null, ok: true };
}

// ---- Inscribir alumna (inscripción + cargo + coacheo agendado) -------------
export async function inscribirAlumna(
  _prev: CompetenciaState,
  formData: FormData,
): Promise<CompetenciaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const competenciaId = limpiar(formData, "competencia_id");
  const inscripcionId = limpiar(formData, "inscripcion_id");
  const nivelId = limpiar(formData, "nivel_id") || null;
  const categoria = limpiar(formData, "categoria") || null;

  if (!competenciaId || !inscripcionId) {
    return { error: "Selecciona una alumna.", ok: false };
  }

  const supabase = createClient();

  // Datos de la competencia (fecha para periodo del cargo y día del coacheo).
  const { data: comp } = await supabase
    .from("competencias")
    .select("id, nombre, fecha")
    .eq("id", competenciaId)
    .maybeSingle();
  const competencia = comp as
    | { id: string; nombre: string; fecha: string | null }
    | null;
  if (!competencia?.fecha) {
    return { error: "La competencia no tiene fecha; edítala primero.", ok: false };
  }

  // Nombre de la alumna (para el título del coacheo).
  const { data: insc } = await supabase
    .from("inscripciones")
    .select("id, persona:personas(nombre, apellidos)")
    .eq("id", inscripcionId)
    .maybeSingle();
  const persona = (insc as {
    persona: { nombre: string; apellidos: string } | null;
  } | null)?.persona;
  const nombreAlumna = persona
    ? `${persona.nombre} ${persona.apellidos}`
    : "Alumna";

  // 1) Inscripción a la competencia.
  const { data: ci, error: errCi } = await supabase
    .from("competencia_inscripciones")
    .insert({
      tenant_id: sesion.tenantId,
      competencia_id: competenciaId,
      inscripcion_id: inscripcionId,
      nivel_id: nivelId,
      categoria,
    })
    .select("id")
    .single();

  if (errCi || !ci) {
    // 23505 = unique_violation (ya inscrita).
    if (errCi?.code === "23505") {
      return { error: "Esta alumna ya está inscrita en la competencia.", ok: false };
    }
    return { error: "No se pudo inscribir a la alumna.", ok: false };
  }

  // 2) Cargo de cuota de coacheo. Monto según tarifa del nivel (si hay).
  let aviso: string | null = null;
  let monto = 0;
  if (nivelId) {
    const { data: tarifa } = await supabase
      .from("competencia_tarifas_nivel")
      .select("monto")
      .eq("nivel_id", nivelId)
      .maybeSingle();
    const m = (tarifa as { monto: number } | null)?.monto;
    if (m == null) {
      aviso = "El nivel no tiene cuota configurada; se generó el cargo en $0.";
    } else {
      monto = Number(m);
    }
  } else {
    aviso = "Sin nivel seleccionado; se generó el cargo en $0.";
  }

  // Concepto 'competencia_cuota' del tenant (para ligar el cargo).
  const { data: concepto } = await supabase
    .from("conceptos")
    .select("id")
    .eq("clave", "competencia_cuota")
    .maybeSingle();
  const conceptoId = (concepto as { id: string } | null)?.id ?? null;

  const { data: cargo, error: errCargo } = await supabase
    .from("cargos")
    .insert({
      tenant_id: sesion.tenantId,
      inscripcion_id: inscripcionId,
      concepto_id: conceptoId,
      monto,
      periodo: periodoDeFecha(competencia.fecha),
      origen: "competencia",
      estado: "pendiente",
    })
    .select("id")
    .single();

  if (errCargo || !cargo) {
    await supabase.from("competencia_inscripciones").delete().eq("id", ci.id);
    return { error: "No se pudo generar el cargo de la cuota.", ok: false };
  }

  // 3) Coacheo agendado: evento propio de la alumna el día de la competencia.
  const inicioUtc = horaLocalAUtc(competencia.fecha, "08:00", TZ_DEFAULT).toISOString();
  const finUtc = horaLocalAUtc(competencia.fecha, "20:00", TZ_DEFAULT).toISOString();

  const { data: evento, error: errEvento } = await supabase
    .from("eventos")
    .insert({
      tenant_id: sesion.tenantId,
      tipo: "evento",
      titulo: `Coacheo — ${nombreAlumna}`,
      inicio_utc: inicioUtc,
      fin_utc: finUtc,
      uid: nuevoUidEvento(),
    })
    .select("id")
    .single();

  if (errEvento || !evento) {
    await supabase.from("cargos").delete().eq("id", cargo.id);
    await supabase.from("competencia_inscripciones").delete().eq("id", ci.id);
    return { error: "No se pudo agendar el coacheo.", ok: false };
  }

  const { data: oc, error: errOc } = await supabase
    .from("evento_ocurrencias")
    .insert({
      tenant_id: sesion.tenantId,
      evento_id: evento.id,
      inicio_utc: inicioUtc,
      fin_utc: finUtc,
    })
    .select("id")
    .single();

  if (errOc || !oc) {
    await supabase.from("eventos").delete().eq("id", evento.id);
    await supabase.from("cargos").delete().eq("id", cargo.id);
    await supabase.from("competencia_inscripciones").delete().eq("id", ci.id);
    return { error: "No se pudo agendar el coacheo.", ok: false };
  }

  const { error: errAsis } = await supabase.from("asistencias").insert({
    tenant_id: sesion.tenantId,
    ocurrencia_id: oc.id,
    inscripcion_id: inscripcionId,
    estado: "sin_marcar",
  });

  if (errAsis) {
    await supabase.from("evento_ocurrencias").delete().eq("id", oc.id);
    await supabase.from("eventos").delete().eq("id", evento.id);
    await supabase.from("cargos").delete().eq("id", cargo.id);
    await supabase.from("competencia_inscripciones").delete().eq("id", ci.id);
    return { error: "No se pudo ligar la asistencia del coacheo.", ok: false };
  }

  revalidatePath("/maestra/competencias");
  revalidatePath(`/maestra/competencias/${competenciaId}`);
  revalidatePath("/maestra/agenda");
  revalidatePath("/maestra/cobranza");
  return { error: null, ok: true, aviso };
}

// ---- Quitar inscripción ----------------------------------------------------
export async function quitarInscripcion(
  _prev: CompetenciaState,
  formData: FormData,
): Promise<CompetenciaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "inscripcion_competencia_id");
  const competenciaId = limpiar(formData, "competencia_id");
  if (!id) return { error: "Datos inválidos.", ok: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("competencia_inscripciones")
    .delete()
    .eq("id", id);
  if (error) return { error: "No se pudo quitar la inscripción.", ok: false };

  revalidatePath("/maestra/competencias");
  if (competenciaId) revalidatePath(`/maestra/competencias/${competenciaId}`);
  return { error: null, ok: true };
}

// ---- Guardar tarifas de coacheo por nivel (Ajustes) ------------------------
export async function guardarTarifasNivel(
  _prev: CompetenciaState,
  formData: FormData,
): Promise<CompetenciaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const supabase = createClient();

  // Los inputs vienen como name="monto_<nivelId>". Recolectamos los válidos.
  const filas: { tenant_id: string; nivel_id: string; monto: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("monto_")) continue;
    const nivelId = key.slice("monto_".length);
    const raw = String(value ?? "").trim();
    if (raw === "") continue; // vacío = no configurar / dejar como está
    const monto = Number(raw);
    if (!Number.isFinite(monto) || monto < 0) {
      return { error: "Los montos deben ser números mayores o iguales a 0.", ok: false };
    }
    filas.push({ tenant_id: sesion.tenantId, nivel_id: nivelId, monto });
  }

  if (filas.length === 0) {
    return { error: null, ok: true };
  }

  const { error } = await supabase
    .from("competencia_tarifas_nivel")
    .upsert(filas, { onConflict: "tenant_id,nivel_id" });

  if (error) return { error: "No se pudieron guardar las cuotas.", ok: false };

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}
