import "server-only";

// Desempeño de la alumna: "camino al próximo nivel" (estado de cada elemento
// oficial del examen del siguiente nivel) y "tareas para la mamá" (checklist).
// El nivel actual vive en personas.nivel_actual_id (global); el próximo nivel
// es el de orden+1 en la misma rama y temporada. El seguimiento y las tareas
// son por tenant (RLS los limita al tenant de la sesión).
import { createClient } from "@/lib/supabase/server";

export type EstadoElemento = "pendiente" | "en_progreso" | "dominado";

export interface DesempenoElemento {
  elementoId: string;
  clave: string | null;
  descripcion: string;
  estado: EstadoElemento;
  nota: string | null;
}

export interface TareaAlumna {
  id: string;
  titulo: string;
  fechaLimite: string | null;
  hecha: boolean;
}

export interface DesempenoAlumna {
  nivelActual: string | null;
  proximoNivel: string | null;
  elementos: DesempenoElemento[];
  progresoPct: number;
  tareas: TareaAlumna[];
}

interface FilaInscripcion {
  persona: {
    nivel: {
      id: string;
      rama: string;
      orden: number;
      temporada_id: string;
    } | null;
  } | null;
}

interface FilaElemento {
  id: string;
  clave: string | null;
  descripcion: string;
  orden: number;
}

interface FilaSeguimiento {
  elemento_id: string;
  estado: EstadoElemento;
  nota: string | null;
}

interface FilaTarea {
  id: string;
  titulo: string;
  fecha_limite: string | null;
  hecha: boolean;
  created_at: string;
}

/**
 * Devuelve el desempeño de una alumna: los elementos del examen de su próximo
 * nivel con el estado marcado por la maestra (default 'pendiente'), el progreso
 * en % (dominados / total) y sus tareas. RLS garantiza que solo se resuelva si
 * la inscripción es del tenant de la sesión.
 */
export async function obtenerDesempeno(
  inscripcionId: string,
): Promise<DesempenoAlumna | null> {
  const supabase = createClient();

  // Nivel actual de la alumna (global, vía persona).
  const { data: inscData } = await supabase
    .from("inscripciones")
    .select(
      "persona:personas(nivel:niveles(id, rama, orden, temporada_id))",
    )
    .eq("id", inscripcionId)
    .maybeSingle();

  const insc = inscData as unknown as FilaInscripcion | null;
  if (!insc) return null;

  const nivelActual = insc.persona?.nivel ?? null;

  // Tareas (independientes del nivel).
  const { data: tareasData } = await supabase
    .from("tareas_alumna")
    .select("id, titulo, fecha_limite, hecha, created_at")
    .eq("inscripcion_id", inscripcionId)
    .order("created_at", { ascending: true });

  const tareas: TareaAlumna[] = ((tareasData ?? []) as FilaTarea[]).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    fechaLimite: t.fecha_limite,
    hecha: t.hecha,
  }));

  // Sin nivel actual → no hay camino que mostrar (solo tareas).
  if (!nivelActual) {
    return {
      nivelActual: null,
      proximoNivel: null,
      elementos: [],
      progresoPct: 0,
      tareas,
    };
  }

  // Próximo nivel: mismo rama y temporada, orden inmediatamente mayor.
  const { data: proxData } = await supabase
    .from("niveles")
    .select("id, nombre")
    .eq("rama", nivelActual.rama)
    .eq("temporada_id", nivelActual.temporada_id)
    .gt("orden", nivelActual.orden)
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();

  const proximo = proxData as { id: string; nombre: string } | null;

  // Nombre del nivel actual (para el encabezado).
  const { data: actualData } = await supabase
    .from("niveles")
    .select("nombre")
    .eq("id", nivelActual.id)
    .maybeSingle();
  const nivelActualNombre =
    (actualData as { nombre: string } | null)?.nombre ?? null;

  if (!proximo) {
    return {
      nivelActual: nivelActualNombre,
      proximoNivel: null,
      elementos: [],
      progresoPct: 0,
      tareas,
    };
  }

  // Elementos oficiales del próximo nivel.
  const { data: elemData } = await supabase
    .from("elementos_examen")
    .select("id, clave, descripcion, orden")
    .eq("nivel_id", proximo.id)
    .order("orden", { ascending: true });

  const elems = (elemData ?? []) as FilaElemento[];

  // Estados marcados por la maestra para esta alumna.
  const { data: segData } = await supabase
    .from("desempeno_elementos")
    .select("elemento_id, estado, nota")
    .eq("inscripcion_id", inscripcionId);

  const seguimiento = new Map<string, FilaSeguimiento>();
  for (const s of (segData ?? []) as FilaSeguimiento[]) {
    seguimiento.set(s.elemento_id, s);
  }

  const elementos: DesempenoElemento[] = elems.map((e) => {
    const s = seguimiento.get(e.id);
    return {
      elementoId: e.id,
      clave: e.clave,
      descripcion: e.descripcion,
      estado: s?.estado ?? "pendiente",
      nota: s?.nota ?? null,
    };
  });

  const dominados = elementos.filter((e) => e.estado === "dominado").length;
  const progresoPct =
    elementos.length > 0
      ? Math.round((dominados / elementos.length) * 100)
      : 0;

  return {
    nivelActual: nivelActualNombre,
    proximoNivel: proximo.nombre,
    elementos,
    progresoPct,
    tareas,
  };
}
