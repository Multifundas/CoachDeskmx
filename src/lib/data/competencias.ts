import "server-only";

// Data layer de Competencias: catálogo de competencias del tenant, alumnas
// inscritas, niveles de la temporada activa y tarifas de coacheo por nivel.
// RLS limita todo al tenant de la sesión.
import type {
  Competencia,
  CompetenciaInscripcionFila,
  NivelOpcion,
  TarifaNivel,
} from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

// ---- Temporada activa -------------------------------------------------------
export async function temporadaActivaId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

// ---- Competencias del tenant ------------------------------------------------
export async function listarCompetencias(): Promise<Competencia[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("competencias")
    .select("id, nombre, sede, fecha, competencia_inscripciones(count)")
    .order("fecha", { ascending: true, nullsFirst: false });

  interface Fila {
    id: string;
    nombre: string;
    sede: string | null;
    fecha: string | null;
    competencia_inscripciones: { count: number }[] | null;
  }
  const filas = (data ?? []) as unknown as Fila[];
  return filas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    sede: c.sede,
    fecha: c.fecha,
    inscritas: c.competencia_inscripciones?.[0]?.count ?? 0,
  }));
}

export async function obtenerCompetencia(
  id: string,
): Promise<Competencia | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("competencias")
    .select("id, nombre, sede, fecha, competencia_inscripciones(count)")
    .eq("id", id)
    .maybeSingle();

  interface Fila {
    id: string;
    nombre: string;
    sede: string | null;
    fecha: string | null;
    competencia_inscripciones: { count: number }[] | null;
  }
  const c = data as unknown as Fila | null;
  if (!c) return null;
  return {
    id: c.id,
    nombre: c.nombre,
    sede: c.sede,
    fecha: c.fecha,
    inscritas: c.competencia_inscripciones?.[0]?.count ?? 0,
  };
}

// ---- Alumnas inscritas a una competencia -----------------------------------
export async function listarInscritas(
  competenciaId: string,
): Promise<CompetenciaInscripcionFila[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("competencia_inscripciones")
    .select(
      "id, inscripcion_id, categoria, nivel:niveles(id, nombre), inscripcion:inscripciones(persona:personas(nombre, apellidos))",
    )
    .eq("competencia_id", competenciaId);

  interface Fila {
    id: string;
    inscripcion_id: string;
    categoria: string | null;
    nivel: { id: string; nombre: string } | null;
    inscripcion: {
      persona: { nombre: string; apellidos: string } | null;
    } | null;
  }
  const filas = (data ?? []) as unknown as Fila[];
  return filas
    .map((f) => ({
      id: f.id,
      inscripcionId: f.inscripcion_id,
      nombre: f.inscripcion?.persona
        ? `${f.inscripcion.persona.nombre} ${f.inscripcion.persona.apellidos}`
        : "(sin nombre)",
      nivelId: f.nivel?.id ?? null,
      nivelNombre: f.nivel?.nombre ?? null,
      categoria: f.categoria,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// ---- Niveles de la temporada activa ----------------------------------------
export async function listarNiveles(): Promise<NivelOpcion[]> {
  const temporadaId = await temporadaActivaId();
  if (!temporadaId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("niveles")
    .select("id, nombre, rama, orden")
    .eq("temporada_id", temporadaId)
    .order("rama", { ascending: true })
    .order("orden", { ascending: true });

  interface Fila {
    id: string;
    nombre: string;
    rama: string;
    orden: number;
  }
  return ((data ?? []) as Fila[]).map((n) => ({
    id: n.id,
    nombre: n.nombre,
    rama: n.rama,
    orden: n.orden,
  }));
}

// ---- Tarifas de coacheo por nivel (niveles LEFT JOIN tarifa del tenant) -----
export async function listarTarifasNivel(): Promise<TarifaNivel[]> {
  const niveles = await listarNiveles();
  if (niveles.length === 0) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("competencia_tarifas_nivel")
    .select("nivel_id, monto");

  const mapa = new Map<string, number>();
  for (const t of (data ?? []) as { nivel_id: string; monto: number }[]) {
    mapa.set(t.nivel_id, Number(t.monto));
  }

  return niveles.map((n) => ({
    nivelId: n.id,
    nivelNombre: n.nombre,
    rama: n.rama,
    orden: n.orden,
    monto: mapa.has(n.id) ? (mapa.get(n.id) as number) : null,
  }));
}

// ---- Alumnas elegibles para inscribir (activa/pausada, no ya inscritas) -----
export interface AlumnaInscribible {
  inscripcionId: string;
  nombre: string;
  nivelActualId: string | null;
  nivelActualNombre: string | null;
}

export async function listarAlumnasInscribibles(
  competenciaId: string,
): Promise<AlumnaInscribible[]> {
  const supabase = createClient();

  // Ya inscritas en esta competencia (para excluirlas).
  const { data: yaData } = await supabase
    .from("competencia_inscripciones")
    .select("inscripcion_id")
    .eq("competencia_id", competenciaId);
  const yaInscritas = new Set(
    ((yaData ?? []) as { inscripcion_id: string }[]).map((r) => r.inscripcion_id),
  );

  const { data } = await supabase
    .from("inscripciones")
    .select(
      "id, estado, persona:personas(nombre, apellidos, nivel_actual_id, nivel:niveles!personas_nivel_actual_fk(id, nombre))",
    )
    .in("estado", ["activa", "pausada"]);

  interface Fila {
    id: string;
    estado: string;
    persona: {
      nombre: string;
      apellidos: string;
      nivel_actual_id: string | null;
      nivel: { id: string; nombre: string } | null;
    } | null;
  }
  const filas = (data ?? []) as unknown as Fila[];
  return filas
    .filter((f) => f.persona !== null && !yaInscritas.has(f.id))
    .map((f) => ({
      inscripcionId: f.id,
      nombre: `${f.persona!.nombre} ${f.persona!.apellidos}`,
      nivelActualId: f.persona!.nivel?.id ?? f.persona!.nivel_actual_id ?? null,
      nivelActualNombre: f.persona!.nivel?.nombre ?? null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
