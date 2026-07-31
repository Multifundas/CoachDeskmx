import "server-only";

// Data layer del catálogo de Conceptos (para Ajustes). Lista conceptos del tenant
// con su precio vigente (conceptos_precios cuyo rango de vigencia cubre hoy).
// Los conceptos con clave 'mod_*' son modificadores (%), su valor vive en
// sede_config, no en conceptos_precios.
import type { ConceptoFila } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

// Catálogo canónico que las maestras usan para pagos y agenda. Se siembra por
// tenant vía sembrarConceptosBase.
export const CONCEPTOS_BASE: {
  clave: string;
  nombre: string;
  tipo: string;
}[] = [
  { clave: "costo_hora_base", nombre: "Costo x Hora Pista Base", tipo: "clase" },
  { clave: "costo_hora_externa_a", nombre: "Costo x Hora Pista Externa A", tipo: "clase" },
  { clave: "costo_hora_externa_b", nombre: "Costo x Hora Pista Externa B", tipo: "clase" },
  { clave: "mod_matutino", nombre: "Costo x Hora Matutino %", tipo: "otro" },
  { clave: "mod_nocturna", nombre: "Costo x Hora Nocturna %", tipo: "otro" },
  { clave: "peinado", nombre: "Peinado", tipo: "otro" },
  { clave: "renta_hielo", nombre: "Renta de Hielo", tipo: "otro" },
  { clave: "edicion_musica", nombre: "Edición de Música", tipo: "otro" },
  { clave: "diseno_vestido", nombre: "Diseño de Vestido", tipo: "otro" },
  { clave: "cuota_pista_externa", nombre: "Cuota Pista Externa", tipo: "otro" },
];

/**
 * Conceptos de sistema (no editables/eliminables desde el catálogo): los
 * modificadores 'mod_*' y los costos por hora 'costo_hora_*', que el cargo
 * automático de clase (Fase 6) resuelve por clave.
 */
export function esConceptoSistema(clave: string): boolean {
  return clave.startsWith("mod_") || clave.startsWith("costo_hora_");
}

/**
 * Deriva una clave estable a partir del nombre: minúsculas, sin acentos, con
 * guiones bajos. No garantiza unicidad (la acción resuelve colisiones).
 */
export function slugConcepto(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export async function listarConceptos(): Promise<ConceptoFila[]> {
  const supabase = createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("conceptos")
    .select(
      "id, clave, nombre, tipo, activo, precios:conceptos_precios(monto, vigencia_desde, vigencia_hasta)",
    )
    .order("tipo", { ascending: true })
    .order("nombre", { ascending: true });

  interface Precio {
    monto: number;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
  }
  interface Fila {
    id: string;
    clave: string;
    nombre: string;
    tipo: string;
    activo: boolean;
    precios: Precio[] | null;
  }
  const filas = (data ?? []) as unknown as Fila[];

  return filas.map((c) => {
    // Precio vigente: el que cubre hoy (desde <= hoy y (hasta null o hasta >= hoy)),
    // el más reciente por vigencia_desde.
    const vigentes = (c.precios ?? [])
      .filter(
        (p) =>
          (!p.vigencia_desde || p.vigencia_desde <= hoy) &&
          (!p.vigencia_hasta || p.vigencia_hasta >= hoy),
      )
      .sort((a, b) => (b.vigencia_desde ?? "").localeCompare(a.vigencia_desde ?? ""));
    const precioVigente = vigentes.length > 0 ? Number(vigentes[0]!.monto) : null;

    return {
      id: c.id,
      clave: c.clave,
      nombre: c.nombre,
      tipo: c.tipo,
      activo: c.activo,
      precioVigente,
      esModificador: c.clave.startsWith("mod_"),
    };
  });
}
