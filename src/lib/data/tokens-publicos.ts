import "server-only";

// Resolución de tokens públicos (enlaces sin sesión que la maestra comparte con
// la alumna, p. ej. por WhatsApp). El acceso es sin login, así que se usa el
// service_role para saltar RLS DESPUÉS de validar el token. El service_role NUNCA
// se expone al cliente. Se devuelve solo un shape mínimo y seguro (sin ids
// internos ni estados de cargo).
import { createClient } from "@supabase/supabase-js";

function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan credenciales de servicio para enlaces públicos.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Sin caché de Next: una revocación de token debe surtir efecto de
      // inmediato, no servir datos obsoletos.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export interface EdcPublico {
  alumna: string;
  folio: string;
  periodo: string;
  total: number;
  cargos: {
    concepto: string;
    monto: number;
    fechaUtc: string | null;
    ubicacion: string | null;
    timezone: string | null;
  }[];
}

interface SnapshotCargo {
  concepto?: unknown;
  monto?: unknown;
  fechaUtc?: unknown;
  ubicacion?: unknown;
  timezone?: unknown;
}
interface Snapshot {
  cargos?: SnapshotCargo[];
}

// El concepto del snapshot puede venir como string o como objeto crudo del join
// `{ nombre }` (cortes viejos). Normaliza a texto.
function nombreConcepto(concepto: unknown): string {
  if (typeof concepto === "string") return concepto;
  if (
    concepto &&
    typeof concepto === "object" &&
    "nombre" in concepto &&
    typeof (concepto as { nombre: unknown }).nombre === "string"
  ) {
    return (concepto as { nombre: string }).nombre;
  }
  return "—";
}

/**
 * Resuelve un token público de tipo 'estado_cuenta' y devuelve una vista de
 * solo lectura del EdC. Devuelve null si el token no existe, está revocado,
 * expiró, no es de estado_cuenta, o el recurso no se encuentra.
 */
export async function resolverEstadoCuentaPublico(
  token: string,
): Promise<EdcPublico | null> {
  if (!token) return null;
  const supabase = clienteAdmin();

  const { data: tk } = await supabase
    .from("tokens_publicos")
    .select("recurso_id, tenant_id, expira_at_utc, revocado, recurso_tipo")
    .eq("token", token)
    .eq("recurso_tipo", "estado_cuenta")
    .eq("revocado", false)
    .maybeSingle();

  if (!tk) return null;
  if (tk.expira_at_utc && new Date(tk.expira_at_utc) <= new Date()) return null;

  const { data: edc } = await supabase
    .from("estados_cuenta")
    .select(
      "folio, periodo, total, snapshot, inscripcion:inscripciones(persona:personas(nombre, apellidos))",
    )
    .eq("id", tk.recurso_id)
    .eq("tenant_id", tk.tenant_id) // defensa en profundidad
    .maybeSingle();

  if (!edc) return null;

  const e = edc as unknown as {
    folio: string;
    periodo: string;
    total: number;
    snapshot: Snapshot | null;
    inscripcion: {
      persona: { nombre: string; apellidos: string } | null;
    } | null;
  };

  const cargos = (e.snapshot?.cargos ?? []).map((c) => ({
    concepto: nombreConcepto(c.concepto),
    monto: Number(c.monto ?? 0),
    fechaUtc: typeof c.fechaUtc === "string" ? c.fechaUtc : null,
    ubicacion: typeof c.ubicacion === "string" ? c.ubicacion : null,
    timezone: typeof c.timezone === "string" ? c.timezone : null,
  }));

  return {
    alumna: e.inscripcion?.persona
      ? `${e.inscripcion.persona.nombre} ${e.inscripcion.persona.apellidos}`
      : "Alumna",
    folio: e.folio,
    periodo: e.periodo,
    total: Number(e.total),
    cargos,
  };
}

export interface CalendarioPublico {
  alumna: string;
  clases: {
    titulo: string;
    inicioUtc: string;
    finUtc: string;
    sede: string | null;
    timezone: string;
  }[];
}

const TZ_DEFAULT = "America/Mexico_City";

/**
 * Resuelve un token público de tipo 'inscripcion' y devuelve las próximas clases
 * de la alumna (solo lectura). Devuelve null si el token no existe, está revocado,
 * expiró, no es de inscripcion, o la inscripción no se encuentra.
 */
export async function resolverCalendarioPublico(
  token: string,
): Promise<CalendarioPublico | null> {
  if (!token) return null;
  const supabase = clienteAdmin();

  const { data: tk } = await supabase
    .from("tokens_publicos")
    .select("recurso_id, tenant_id, expira_at_utc, revocado, recurso_tipo")
    .eq("token", token)
    .eq("recurso_tipo", "inscripcion")
    .eq("revocado", false)
    .maybeSingle();

  if (!tk) return null;
  if (tk.expira_at_utc && new Date(tk.expira_at_utc) <= new Date()) return null;

  // Alumna (validando tenant_id como defensa en profundidad).
  const { data: insc } = await supabase
    .from("inscripciones")
    .select("id, persona:personas(nombre, apellidos)")
    .eq("id", tk.recurso_id)
    .eq("tenant_id", tk.tenant_id)
    .maybeSingle();

  if (!insc) return null;

  const i = insc as unknown as {
    persona: { nombre: string; apellidos: string } | null;
  };

  // Ocurrencias de la alumna vía asistencias.
  const { data: asis } = await supabase
    .from("asistencias")
    .select("ocurrencia_id")
    .eq("inscripcion_id", tk.recurso_id);

  const ocurrenciaIds = ((asis ?? []) as { ocurrencia_id: string }[]).map(
    (a) => a.ocurrencia_id,
  );

  let clases: CalendarioPublico["clases"] = [];
  if (ocurrenciaIds.length > 0) {
    const { data: ocs } = await supabase
      .from("evento_ocurrencias")
      .select(
        "inicio_utc, fin_utc, estado, evento:eventos(titulo, sede:sedes(nombre, timezone))",
      )
      .in("id", ocurrenciaIds)
      .eq("estado", "activo")
      .gte("inicio_utc", new Date().toISOString())
      .order("inicio_utc", { ascending: true })
      .limit(30);

    const filas = (ocs ?? []) as unknown as {
      inicio_utc: string;
      fin_utc: string;
      evento: {
        titulo: string;
        sede: { nombre: string; timezone: string } | null;
      } | null;
    }[];

    clases = filas.map((f) => ({
      titulo: f.evento?.titulo ?? "Clase",
      inicioUtc: f.inicio_utc,
      finUtc: f.fin_utc,
      sede: f.evento?.sede?.nombre ?? null,
      timezone: f.evento?.sede?.timezone ?? TZ_DEFAULT,
    }));
  }

  return {
    alumna: i.persona
      ? `${i.persona.nombre} ${i.persona.apellidos}`
      : "Alumna",
    clases,
  };
}

export type EstadoElementoPublico =
  | "pendiente"
  | "en_progreso"
  | "dominado";

export interface DesempenoPublico {
  alumna: string;
  proximoNivel: string | null;
  progresoPct: number;
  elementos: {
    descripcion: string;
    estado: EstadoElementoPublico;
  }[];
  tareas: {
    titulo: string;
    fechaLimite: string | null;
  }[];
}

/**
 * Resuelve un token público de tipo 'desempeno' y devuelve el camino al próximo
 * nivel de la alumna (elementos con su estado) y sus tareas pendientes, de solo
 * lectura. Devuelve null si el token no existe, está revocado, expiró, no es de
 * desempeno, o la inscripción no se encuentra. Solo tareas pendientes (sin ids
 * ni notas internas).
 */
export async function resolverDesempenoPublico(
  token: string,
): Promise<DesempenoPublico | null> {
  if (!token) return null;
  const supabase = clienteAdmin();

  const { data: tk } = await supabase
    .from("tokens_publicos")
    .select("recurso_id, tenant_id, expira_at_utc, revocado, recurso_tipo")
    .eq("token", token)
    .eq("recurso_tipo", "desempeno")
    .eq("revocado", false)
    .maybeSingle();

  if (!tk) return null;
  if (tk.expira_at_utc && new Date(tk.expira_at_utc) <= new Date()) return null;

  // Alumna + nivel actual (validando tenant_id como defensa en profundidad).
  const { data: insc } = await supabase
    .from("inscripciones")
    .select(
      "id, persona:personas(nombre, apellidos, nivel:niveles(id, rama, orden, temporada_id))",
    )
    .eq("id", tk.recurso_id)
    .eq("tenant_id", tk.tenant_id)
    .maybeSingle();

  if (!insc) return null;

  const i = insc as unknown as {
    persona: {
      nombre: string;
      apellidos: string;
      nivel: {
        id: string;
        rama: string;
        orden: number;
        temporada_id: string;
      } | null;
    } | null;
  };

  const alumna = i.persona
    ? `${i.persona.nombre} ${i.persona.apellidos}`
    : "Alumna";

  // Tareas pendientes (checklist para la mamá).
  const { data: tareasData } = await supabase
    .from("tareas_alumna")
    .select("titulo, fecha_limite, created_at")
    .eq("inscripcion_id", tk.recurso_id)
    .eq("hecha", false)
    .order("created_at", { ascending: true });

  const tareas = (
    (tareasData ?? []) as { titulo: string; fecha_limite: string | null }[]
  ).map((t) => ({ titulo: t.titulo, fechaLimite: t.fecha_limite }));

  const nivelActual = i.persona?.nivel ?? null;
  if (!nivelActual) {
    return { alumna, proximoNivel: null, progresoPct: 0, elementos: [], tareas };
  }

  // Próximo nivel (misma rama y temporada, orden inmediatamente mayor).
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
  if (!proximo) {
    return { alumna, proximoNivel: null, progresoPct: 0, elementos: [], tareas };
  }

  const { data: elemData } = await supabase
    .from("elementos_examen")
    .select("id, descripcion, orden")
    .eq("nivel_id", proximo.id)
    .order("orden", { ascending: true });

  const elems = (elemData ?? []) as {
    id: string;
    descripcion: string;
  }[];

  const { data: segData } = await supabase
    .from("desempeno_elementos")
    .select("elemento_id, estado")
    .eq("inscripcion_id", tk.recurso_id);

  const estados = new Map<string, EstadoElementoPublico>();
  for (const s of (segData ?? []) as {
    elemento_id: string;
    estado: EstadoElementoPublico;
  }[]) {
    estados.set(s.elemento_id, s.estado);
  }

  const elementos = elems.map((e) => ({
    descripcion: e.descripcion,
    estado: estados.get(e.id) ?? ("pendiente" as EstadoElementoPublico),
  }));

  const dominados = elementos.filter((e) => e.estado === "dominado").length;
  const progresoPct =
    elementos.length > 0
      ? Math.round((dominados / elementos.length) * 100)
      : 0;

  return {
    alumna,
    proximoNivel: proximo.nombre,
    progresoPct,
    elementos,
    tareas,
  };
}
