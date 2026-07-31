import "server-only";

// Data layer de Cobranza: lista los cargos del tenant con alumna, concepto,
// periodo, origen, monto, saldo (monto - aplicaciones de pago) y estado. RLS
// limita al tenant. Soporta filtros por alumna/estado/periodo.
import type {
  AlumnaOpcion,
  CargoFila,
  EstadoCargo,
  OrigenCargo,
} from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

export interface FiltrosCargos {
  inscripcionId?: string;
  estado?: EstadoCargo;
  periodo?: string; // 'YYYY-MM'
  incluirCancelados?: boolean; // por defecto false
}

export async function listarCargos(
  filtros: FiltrosCargos = {},
): Promise<CargoFila[]> {
  const supabase = createClient();
  let query = supabase
    .from("cargos")
    .select(
      "id, inscripcion_id, monto, periodo, origen, estado, concepto:conceptos(nombre), inscripcion:inscripciones(persona:personas(nombre, apellidos)), aplicaciones:pagos_aplicaciones(monto)",
    )
    .order("created_at", { ascending: false });

  if (filtros.inscripcionId)
    query = query.eq("inscripcion_id", filtros.inscripcionId);
  if (filtros.estado) query = query.eq("estado", filtros.estado);
  if (filtros.periodo) query = query.eq("periodo", filtros.periodo);
  if (!filtros.incluirCancelados && !filtros.estado) {
    query = query.neq("estado", "cancelado");
  }

  const { data } = await query;

  interface Fila {
    id: string;
    inscripcion_id: string;
    monto: number;
    periodo: string | null;
    origen: OrigenCargo;
    estado: EstadoCargo;
    concepto: { nombre: string } | null;
    inscripcion: {
      persona: { nombre: string; apellidos: string } | null;
    } | null;
    aplicaciones: { monto: number }[] | null;
  }
  const filas = (data ?? []) as unknown as Fila[];
  return filas.map((c) => {
    const monto = Number(c.monto);
    const aplicado = (c.aplicaciones ?? []).reduce(
      (s, a) => s + Number(a.monto),
      0,
    );
    return {
      id: c.id,
      inscripcionId: c.inscripcion_id,
      alumna: c.inscripcion?.persona
        ? `${c.inscripcion.persona.nombre} ${c.inscripcion.persona.apellidos}`
        : "(sin alumna)",
      concepto: c.concepto?.nombre ?? "—",
      periodo: c.periodo,
      origen: c.origen,
      monto,
      saldo: Math.round((monto - aplicado) * 100) / 100,
      estado: c.estado,
    };
  });
}

/** Alumnas con inscripción activa/pausada, para selects y filtros. */
export async function listarAlumnasOpciones(): Promise<AlumnaOpcion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("inscripciones")
    .select("id, estado, persona:personas(nombre, apellidos)")
    .in("estado", ["activa", "pausada"]);

  interface Fila {
    id: string;
    persona: { nombre: string; apellidos: string } | null;
  }
  const filas = (data ?? []) as unknown as Fila[];
  return filas
    .map((f) => ({
      inscripcionId: f.id,
      nombre: f.persona
        ? `${f.persona.nombre} ${f.persona.apellidos}`
        : "(sin nombre)",
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
