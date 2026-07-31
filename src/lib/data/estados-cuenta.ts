import "server-only";

// Data layer de Estados de Cuenta (cortes mensuales). Lista los EdC sellados,
// obtiene uno con su snapshot congelado y previsualiza el corte de un periodo
// (cargos abiertos aún no incluidos en ningún EdC).
import type { EdcFila, EstadoCargo, OrigenCargo } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

export interface FiltrosEdc {
  inscripcionId?: string;
  periodo?: string;
}

export async function listarEstadosCuenta(
  filtros: FiltrosEdc = {},
): Promise<EdcFila[]> {
  const supabase = createClient();
  let query = supabase
    .from("estados_cuenta")
    .select(
      "id, folio, periodo, total, inscripcion_id, sellado_at_utc, inscripcion:inscripciones(persona:personas(nombre, apellidos))",
    )
    .order("sellado_at_utc", { ascending: false });

  if (filtros.inscripcionId)
    query = query.eq("inscripcion_id", filtros.inscripcionId);
  if (filtros.periodo) query = query.eq("periodo", filtros.periodo);

  const { data } = await query;

  interface Fila {
    id: string;
    folio: string;
    periodo: string;
    total: number;
    inscripcion_id: string;
    sellado_at_utc: string;
    inscripcion: {
      persona: { nombre: string; apellidos: string } | null;
    } | null;
  }
  const filas = (data ?? []) as unknown as Fila[];
  return filas.map((e) => ({
    id: e.id,
    folio: e.folio,
    periodo: e.periodo,
    total: Number(e.total),
    inscripcionId: e.inscripcion_id,
    alumna: e.inscripcion?.persona
      ? `${e.inscripcion.persona.nombre} ${e.inscripcion.persona.apellidos}`
      : "(sin alumna)",
    selladoAtUtc: e.sellado_at_utc,
  }));
}

export interface EdcSnapshotCargo {
  id: string;
  concepto: string;
  origen: OrigenCargo;
  monto: number;
  estado: EstadoCargo;
  // Detalle para que la mamá no tenga dudas del cargo. Presentes cuando el cargo
  // proviene de una clase con ocurrencia (fecha/hora y sede). Cortes viejos no
  // los tienen: por eso son opcionales.
  fechaUtc?: string | null;
  ubicacion?: string | null;
  timezone?: string | null;
}

export interface EdcSnapshot {
  periodo: string;
  generado_at: string;
  cargos: EdcSnapshotCargo[];
}

export interface EdcDetalle extends EdcFila {
  snapshot: EdcSnapshot;
}

export async function obtenerEstadoCuenta(
  id: string,
): Promise<EdcDetalle | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estados_cuenta")
    .select(
      "id, folio, periodo, total, inscripcion_id, sellado_at_utc, snapshot, inscripcion:inscripciones(persona:personas(nombre, apellidos))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const e = data as unknown as {
    id: string;
    folio: string;
    periodo: string;
    total: number;
    inscripcion_id: string;
    sellado_at_utc: string;
    snapshot: EdcSnapshot;
    inscripcion: {
      persona: { nombre: string; apellidos: string } | null;
    } | null;
  };
  return {
    id: e.id,
    folio: e.folio,
    periodo: e.periodo,
    total: Number(e.total),
    inscripcionId: e.inscripcion_id,
    alumna: e.inscripcion?.persona
      ? `${e.inscripcion.persona.nombre} ${e.inscripcion.persona.apellidos}`
      : "(sin alumna)",
    selladoAtUtc: e.sellado_at_utc,
    snapshot: e.snapshot,
  };
}

export interface CargoBorrador {
  id: string;
  concepto: string;
  origen: OrigenCargo;
  monto: number;
  estado: EstadoCargo;
}

export interface PrevisualizacionCorte {
  cargos: CargoBorrador[];
  total: number;
}

/**
 * Cargos abiertos (pendiente/parcial, sin estado_cuenta_id) de un periodo,
 * candidatos a incluirse en un corte. Total = suma de montos.
 */
export async function previsualizarCorte(
  inscripcionId: string,
  periodo: string,
): Promise<PrevisualizacionCorte> {
  const supabase = createClient();
  const { data } = await supabase
    .from("cargos")
    .select("id, monto, origen, estado, concepto:conceptos(nombre)")
    .eq("inscripcion_id", inscripcionId)
    .eq("periodo", periodo)
    .is("estado_cuenta_id", null)
    .in("estado", ["pendiente", "parcial"])
    .order("created_at", { ascending: true });

  interface Fila {
    id: string;
    monto: number;
    origen: OrigenCargo;
    estado: EstadoCargo;
    concepto: { nombre: string } | null;
  }
  const filas = (data ?? []) as unknown as Fila[];
  const cargos = filas.map((c) => ({
    id: c.id,
    concepto: c.concepto?.nombre ?? "—",
    origen: c.origen,
    monto: Number(c.monto),
    estado: c.estado,
  }));
  const total = Math.round(cargos.reduce((s, c) => s + c.monto, 0) * 100) / 100;
  return { cargos, total };
}
