import "server-only";

import type {
  EstadoAsistencia,
  EstadoEvento,
  OcurrenciaAgenda,
  SedeOpcion,
  TipoEvento,
} from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

// Zona horaria por defecto cuando el evento no tiene sede asignada.
export const TZ_DEFAULT = "America/Mexico_City";

// Normaliza texto para búsqueda: minúsculas y sin acentos.
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ---- Sedes (pistas) para filtros y selector -------------------------------
export async function listarSedes(): Promise<SedeOpcion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sedes")
    .select("id, nombre, timezone")
    .eq("activa", true)
    .order("nombre", { ascending: true });

  interface Fila {
    id: string;
    nombre: string;
    timezone: string | null;
  }
  const filas = (data ?? []) as Fila[];
  return filas.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    timezone: s.timezone ?? TZ_DEFAULT,
  }));
}

// ---- Alumnas (inscripciones activas) para filtro/asistencia ---------------
export interface AlumnaOpcion {
  inscripcionId: string;
  nombre: string;
}

export async function listarAlumnasOpciones(): Promise<AlumnaOpcion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("inscripciones")
    .select("id, estado, persona:personas(nombre, apellidos)")
    .in("estado", ["activa", "pausada"]);

  interface Fila {
    id: string;
    estado: string;
    persona: { nombre: string; apellidos: string } | null;
  }
  const filas = (data ?? []) as unknown as Fila[];
  return filas
    .filter((f): f is Fila & { persona: NonNullable<Fila["persona"]> } =>
      f.persona !== null,
    )
    .map((f) => ({
      inscripcionId: f.id,
      nombre: `${f.persona.nombre} ${f.persona.apellidos}`,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// ---- Ocurrencias en un rango UTC ------------------------------------------
interface FilaOcurrencia {
  id: string;
  evento_id: string;
  inicio_utc: string;
  fin_utc: string;
  estado: EstadoEvento;
  evento: {
    titulo: string;
    tipo: TipoEvento;
    rrule: string | null;
    sede_id: string | null;
    sede: { nombre: string; timezone: string | null } | null;
  } | null;
}

/**
 * Lista las ocurrencias que caen dentro de [desdeUtc, hastaUtc). Filtros
 * opcionales por sede (vía evento.sede_id) y por alumna (vía asistencias).
 * RLS limita al tenant de la sesión.
 */
export async function listarOcurrenciasRango(
  desdeUtc: string,
  hastaUtc: string,
  filtros?: {
    sedeId?: string;
    inscripcionId?: string;
    tipo?: TipoEvento;
    q?: string;
  },
): Promise<OcurrenciaAgenda[]> {
  const supabase = createClient();

  // Si se filtra por alumna, primero obtenemos las ocurrencias con asistencia.
  let ocurrenciaIds: string[] | null = null;
  if (filtros?.inscripcionId) {
    const { data: asis } = await supabase
      .from("asistencias")
      .select("ocurrencia_id")
      .eq("inscripcion_id", filtros.inscripcionId);
    ocurrenciaIds = ((asis ?? []) as { ocurrencia_id: string }[]).map(
      (a) => a.ocurrencia_id,
    );
    if (ocurrenciaIds.length === 0) return [];
  }

  let query = supabase
    .from("evento_ocurrencias")
    .select(
      "id, evento_id, inicio_utc, fin_utc, estado, evento:eventos(titulo, tipo, rrule, sede_id, sede:sedes(nombre, timezone))",
    )
    .gte("inicio_utc", desdeUtc)
    .lt("inicio_utc", hastaUtc)
    .order("inicio_utc", { ascending: true });

  if (ocurrenciaIds) query = query.in("id", ocurrenciaIds);

  const { data } = await query;
  let filas = (data ?? []) as unknown as FilaOcurrencia[];

  // Filtro por sede: se aplica sobre el join (evento.sede_id).
  if (filtros?.sedeId) {
    filas = filas.filter((f) => f.evento?.sede_id === filtros.sedeId);
  }

  // Filtro por tipo de evento (clase, competencia, examen…).
  if (filtros?.tipo) {
    filas = filas.filter((f) => f.evento?.tipo === filtros.tipo);
  }

  // Buscador por título: insensible a mayúsculas y acentos.
  const q = filtros?.q ? normalizar(filtros.q) : "";
  if (q) {
    filas = filas.filter((f) =>
      normalizar(f.evento?.titulo ?? "").includes(q),
    );
  }

  return filas
    .filter((f): f is FilaOcurrencia & { evento: NonNullable<FilaOcurrencia["evento"]> } =>
      f.evento !== null,
    )
    .map((f) => ({
      ocurrenciaId: f.id,
      eventoId: f.evento_id,
      titulo: f.evento.titulo,
      tipo: f.evento.tipo,
      inicioUtc: f.inicio_utc,
      finUtc: f.fin_utc,
      estado: f.estado,
      esSerie: !!f.evento.rrule,
      sedeId: f.evento.sede_id,
      sedeNombre: f.evento.sede?.nombre ?? null,
      timezoneSede: f.evento.sede?.timezone ?? TZ_DEFAULT,
    }));
}

// ---- Detalle de una ocurrencia + asistencia --------------------------------
export interface AsistenciaFila {
  inscripcionId: string;
  nombre: string;
  estado: EstadoAsistencia;
}

export interface OcurrenciaDetalle extends OcurrenciaAgenda {
  asistencias: AsistenciaFila[];
}

export async function obtenerOcurrencia(
  ocurrenciaId: string,
): Promise<OcurrenciaDetalle | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("evento_ocurrencias")
    .select(
      "id, evento_id, inicio_utc, fin_utc, estado, evento:eventos(titulo, tipo, rrule, sede_id, sede:sedes(nombre, timezone))",
    )
    .eq("id", ocurrenciaId)
    .maybeSingle();

  const f = data as unknown as FilaOcurrencia | null;
  if (!f || !f.evento) return null;

  const base: OcurrenciaAgenda = {
    ocurrenciaId: f.id,
    eventoId: f.evento_id,
    titulo: f.evento.titulo,
    tipo: f.evento.tipo,
    inicioUtc: f.inicio_utc,
    finUtc: f.fin_utc,
    estado: f.estado,
    esSerie: !!f.evento.rrule,
    sedeId: f.evento.sede_id,
    sedeNombre: f.evento.sede?.nombre ?? null,
    timezoneSede: f.evento.sede?.timezone ?? TZ_DEFAULT,
  };

  // Asistencias existentes para esta ocurrencia.
  const { data: asisData } = await supabase
    .from("asistencias")
    .select("inscripcion_id, estado")
    .eq("ocurrencia_id", ocurrenciaId);
  const asisMap = new Map<string, EstadoAsistencia>();
  for (const a of (asisData ?? []) as {
    inscripcion_id: string;
    estado: EstadoAsistencia;
  }[]) {
    asisMap.set(a.inscripcion_id, a.estado);
  }

  const alumnas = await listarAlumnasOpciones();
  const asistencias: AsistenciaFila[] = alumnas.map((al) => ({
    inscripcionId: al.inscripcionId,
    nombre: al.nombre,
    estado: asisMap.get(al.inscripcionId) ?? "sin_marcar",
  }));

  return { ...base, asistencias };
}
