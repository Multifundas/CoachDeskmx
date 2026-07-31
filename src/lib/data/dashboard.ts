import "server-only";

import type {
  Cargo,
  EstadoCargo,
  EstadoEvento,
  EstadoInscripcion,
  EventoOcurrencia,
  Inscripcion,
} from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

// Capa de acceso a datos real (Supabase). El aislamiento por tenant lo aplica
// Postgres vía RLS usando el JWT del usuario autenticado: no filtramos por
// tenant en la app, solo consultamos y la base decide qué filas son visibles.

// Cargo se considera "por cobrar" mientras no esté pagado ni cancelado.
const CARGO_ABIERTO: EstadoCargo[] = ["pendiente", "parcial", "en_corte" as EstadoCargo];

interface FilaCargo {
  monto: number | string;
  estado: EstadoCargo;
  inscripcion_id: string;
}

interface FilaInscripcion {
  id: string;
  tenant_id: string;
  estado: EstadoInscripcion;
  fecha_alta: string;
  persona: {
    id: string;
    nombre: string;
    apellidos: string;
    fecha_nacimiento: string | null;
    nivel: { nombre: string } | null;
  } | null;
}

interface FilaOcurrencia {
  id: string;
  tenant_id: string;
  inicio_utc: string;
  fin_utc: string;
  estado: EstadoEvento;
  evento: {
    titulo: string;
    tipo: string;
    sede: { nombre: string; timezone: string } | null;
  } | null;
}

// Saldo pendiente por inscripción, sumando cargos abiertos.
async function saldosPorInscripcion(
  supabase: ReturnType<typeof createClient>,
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("cargos")
    .select("monto, estado, inscripcion_id")
    .in("estado", CARGO_ABIERTO);

  const filas = (data ?? []) as FilaCargo[];
  const saldos = new Map<string, number>();
  for (const c of filas) {
    const previo = saldos.get(c.inscripcion_id) ?? 0;
    saldos.set(c.inscripcion_id, previo + Number(c.monto));
  }
  return saldos;
}

export async function listarInscripciones(): Promise<Inscripcion[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("inscripciones")
    .select(
      "id, tenant_id, estado, fecha_alta, persona:personas(id, nombre, apellidos, fecha_nacimiento, nivel:niveles(nombre))",
    )
    .order("fecha_alta", { ascending: true });

  const filas = (data ?? []) as unknown as FilaInscripcion[];
  const saldos = await saldosPorInscripcion(supabase);

  return filas
    .filter((f): f is FilaInscripcion & { persona: NonNullable<FilaInscripcion["persona"]> } =>
      f.persona !== null,
    )
    .map((f) => ({
      id: f.id,
      tenantId: f.tenant_id,
      estado: f.estado,
      fechaAlta: f.fecha_alta,
      saldoMxn: saldos.get(f.id) ?? 0,
      persona: {
        id: f.persona.id,
        nombre: f.persona.nombre,
        apellidos: f.persona.apellidos,
        fechaNacimiento: f.persona.fecha_nacimiento,
        nivelActual: f.persona.nivel?.nombre ?? null,
      },
    }));
}

export async function listarCargos(): Promise<Cargo[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("cargos")
    .select(
      "id, tenant_id, inscripcion_id, monto, periodo, estado, concepto:conceptos(nombre)",
    )
    .order("created_at", { ascending: false });

  interface FilaCargoDetalle {
    id: string;
    tenant_id: string;
    inscripcion_id: string;
    monto: number | string;
    periodo: string | null;
    estado: EstadoCargo;
    concepto: { nombre: string } | null;
  }

  const filas = (data ?? []) as unknown as FilaCargoDetalle[];

  return filas.map((f) => ({
    id: f.id,
    tenantId: f.tenant_id,
    inscripcionId: f.inscripcion_id,
    concepto: f.concepto?.nombre ?? "—",
    montoMxn: Number(f.monto),
    periodo: f.periodo ?? "",
    estado: f.estado,
  }));
}

// Inscripciones visibles para el tutor autenticado. RLS limita las filas a las
// personas de las que este tutor es responsable (persona_tutor).
export async function listarInscripcionesTutor(): Promise<Inscripcion[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("inscripciones")
    .select(
      "id, tenant_id, estado, fecha_alta, persona:personas(id, nombre, apellidos, fecha_nacimiento, nivel:niveles(nombre))",
    )
    .order("fecha_alta", { ascending: true });

  const filas = (data ?? []) as unknown as FilaInscripcion[];
  const saldos = await saldosPorInscripcion(supabase);

  return filas
    .filter((f): f is FilaInscripcion & { persona: NonNullable<FilaInscripcion["persona"]> } =>
      f.persona !== null,
    )
    .map((f) => ({
      id: f.id,
      tenantId: f.tenant_id,
      estado: f.estado,
      fechaAlta: f.fecha_alta,
      saldoMxn: saldos.get(f.id) ?? 0,
      persona: {
        id: f.persona.id,
        nombre: f.persona.nombre,
        apellidos: f.persona.apellidos,
        fechaNacimiento: f.persona.fecha_nacimiento,
        nivelActual: f.persona.nivel?.nombre ?? null,
      },
    }));
}

export async function listarOcurrencias(): Promise<EventoOcurrencia[]> {
  const supabase = createClient();

  // Solo clases: la sección "Próximas clases" excluye competencias, exámenes y
  // otros tipos de evento. El filtro se aplica sobre el evento padre (!inner para
  // que el join restrinja las ocurrencias a las de tipo 'clase').
  const { data } = await supabase
    .from("evento_ocurrencias")
    .select(
      "id, tenant_id, inicio_utc, fin_utc, estado, evento:eventos!inner(titulo, tipo, sede:sedes(nombre, timezone))",
    )
    .eq("estado", "activo")
    .eq("evento.tipo", "clase")
    .order("inicio_utc", { ascending: true });

  const filas = (data ?? []) as unknown as FilaOcurrencia[];

  return filas.map((f) => ({
    id: f.id,
    tenantId: f.tenant_id,
    titulo: f.evento?.titulo ?? "Clase",
    sede: f.evento?.sede?.nombre ?? "—",
    inicioUtc: f.inicio_utc,
    finUtc: f.fin_utc,
    timezoneSede: f.evento?.sede?.timezone ?? "America/Mexico_City",
    estado: f.estado,
  }));
}

// ---- Vistas de familia (tutor / alumna) ------------------------------------

export interface MiInscripcion {
  inscripcionId: string;
  personaId: string;
  nombre: string;
  apellidos: string;
  nivelActual: string | null;
}

interface FilaMiInscripcion {
  id: string;
  estado: EstadoInscripcion;
  persona: {
    id: string;
    nombre: string;
    apellidos: string;
    nivel: { nombre: string } | null;
  } | null;
}

/**
 * Inscripción de la ALUMNA autenticada. RLS (personas.app_user_id) limita las
 * filas a su propia inscripción. Prefiere una inscripción activa. null si la
 * cuenta aún no está vinculada a una persona.
 */
export async function obtenerMiInscripcionAlumna(): Promise<MiInscripcion | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("inscripciones")
    .select(
      "id, estado, persona:personas(id, nombre, apellidos, nivel:niveles(nombre))",
    )
    .limit(5);

  const filas = (data ?? []) as unknown as FilaMiInscripcion[];
  if (filas.length === 0) return null;

  // Prefiere una inscripción activa; si no, la primera disponible.
  const elegida = filas.find((f) => f.estado === "activa") ?? filas[0];
  if (!elegida?.persona) return null;

  return {
    inscripcionId: elegida.id,
    personaId: elegida.persona.id,
    nombre: elegida.persona.nombre,
    apellidos: elegida.persona.apellidos,
    nivelActual: elegida.persona.nivel?.nombre ?? null,
  };
}

/**
 * Próximas clases (ocurrencias activas futuras) de una inscripción, resueltas
 * vía asistencias. Sirve a la agenda de tutor y alumna. RLS ya limita las filas
 * a las inscripciones que el usuario puede ver.
 */
export async function proximasClasesInscripcion(
  inscripcionId: string,
  limite = 20,
): Promise<EventoOcurrencia[]> {
  const supabase = createClient();

  const { data: asis } = await supabase
    .from("asistencias")
    .select("ocurrencia_id")
    .eq("inscripcion_id", inscripcionId);

  const ocurrenciaIds = ((asis ?? []) as { ocurrencia_id: string }[]).map(
    (a) => a.ocurrencia_id,
  );
  if (ocurrenciaIds.length === 0) return [];

  const { data } = await supabase
    .from("evento_ocurrencias")
    .select(
      "id, tenant_id, inicio_utc, fin_utc, estado, evento:eventos(titulo, tipo, sede:sedes(nombre, timezone))",
    )
    .in("id", ocurrenciaIds)
    .eq("estado", "activo")
    .gte("inicio_utc", new Date().toISOString())
    .order("inicio_utc", { ascending: true })
    .limit(limite);

  const filas = (data ?? []) as unknown as FilaOcurrencia[];

  return filas.map((f) => ({
    id: f.id,
    tenantId: f.tenant_id,
    titulo: f.evento?.titulo ?? "Clase",
    sede: f.evento?.sede?.nombre ?? "—",
    inicioUtc: f.inicio_utc,
    finUtc: f.fin_utc,
    timezoneSede: f.evento?.sede?.timezone ?? "America/Mexico_City",
    estado: f.estado,
  }));
}
