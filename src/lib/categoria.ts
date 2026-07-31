// Categorías FEMEPASHIDI derivadas de la fecha de nacimiento.
//
// La temporada corre del 1 de julio al 30 de junio del año siguiente. La
// categoría se calcula con la edad cumplida al 1 de julio del año en que inicia
// la temporada (fecha de corte). Es una derivación pura: NO se guarda en la BD,
// se calcula cada vez desde la fecha de nacimiento.
//
// Fechas ISO 'YYYY-MM-DD' se parsean por partes (sin `new Date(iso)`) para
// evitar el desfase de zona horaria.

export type CategoriaEdadId =
  | "pre_infantil"
  | "infantil_a"
  | "infantil_b"
  | "juvenil_a"
  | "juvenil_b"
  | "mayor"
  | "adulto";

export interface CategoriaEdad {
  id: CategoriaEdadId;
  nombre: string;
  /** Edad mínima cumplida al 1 de julio (inclusive). */
  edadMin: number;
  /** Edad máxima cumplida al 1 de julio (inclusive); null = sin tope. */
  edadMax: number | null;
}

// Rangos de edad cumplida al 1 de julio (corte de temporada). Derivados de la
// tabla oficial 2026/2027 (ventanas de nacimiento respecto al 1 jul).
export const CATEGORIAS_EDAD: CategoriaEdad[] = [
  { id: "pre_infantil", nombre: "Pre-Infantil", edadMin: 0, edadMax: 3 },
  { id: "infantil_a", nombre: "Infantil A", edadMin: 4, edadMax: 6 },
  { id: "infantil_b", nombre: "Infantil B", edadMin: 7, edadMax: 9 },
  { id: "juvenil_a", nombre: "Juvenil A", edadMin: 10, edadMax: 13 },
  { id: "juvenil_b", nombre: "Juvenil B", edadMin: 14, edadMax: 17 },
  { id: "mayor", nombre: "Mayor", edadMin: 18, edadMax: 27 },
  { id: "adulto", nombre: "Adulto", edadMin: 28, edadMax: null },
];

export type ElegibilidadIsuId =
  | "noviciados"
  | "avanzados_1"
  | "avanzados_2"
  | "novicios_abierto"
  | "avanzados_1_abierto"
  | null;

export interface Categoria {
  /** Año en que inicia la temporada (el julio del corte). */
  temporadaInicio: number;
  /** Etiqueta de la temporada, p.ej. "2026/2027". */
  temporada: string;
  /** Edad cumplida al 1 de julio del corte. */
  edadCorte: number;
  categoriaEdad: CategoriaEdad;
  /** Elegibilidad ISU (Noviciados/Avanzados) o su variante "Abierto". */
  elegibilidadIsu: ElegibilidadIsuId;
  /** Nombre legible de la elegibilidad ISU, o null si no aplica. */
  elegibilidadIsuNombre: string | null;
}

/**
 * Año en que inicia la temporada vigente para una fecha de referencia.
 * De ene–jun pertenece a la temporada que arrancó el julio anterior.
 */
export function temporadaInicioEn(ref: Date = new Date()): number {
  const anio = ref.getFullYear();
  const mes = ref.getMonth() + 1; // 1-12
  return mes >= 7 ? anio : anio - 1;
}

/** Edad cumplida al 1 de julio del año `anioCorte` desde 'YYYY-MM-DD'. */
function edadAlCorte(iso: string, anioCorte: number): number | null {
  const [ys, ms, ds] = iso.slice(0, 10).split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return null;
  // Corte: 1 de julio (mes 7, día 1) del año de temporada.
  let edad = anioCorte - y;
  // Aún no cumple si nació después del 1 de julio (mes > 7, o jul con día > 1).
  if (m > 7 || (m === 7 && d > 1)) edad -= 1;
  return edad;
}

function categoriaEdadPara(edad: number): CategoriaEdad {
  for (const c of CATEGORIAS_EDAD) {
    if (edad >= c.edadMin && (c.edadMax === null || edad <= c.edadMax)) return c;
  }
  // Edad fuera de todo rango (no debería ocurrir): la más alta.
  return CATEGORIAS_EDAD[CATEGORIAS_EDAD.length - 1]!;
}

// Elegibilidad ISU por edad cumplida al 1 de julio del corte:
// - Noviciados (Advanced Novice): ≥10 y <16.
// - Avanzados 1 (Junior): ≥13 y <19.
// - Avanzados 2 (Senior, única): ≥17.
// Si no cumple edad para Noviciados/Avanzados 1, compite en la variante "Abierto".
function elegibilidadIsuPara(edad: number): {
  id: ElegibilidadIsuId;
  nombre: string | null;
} {
  if (edad >= 17) return { id: "avanzados_2", nombre: "Avanzados 2 (Senior ISU)" };
  if (edad >= 13 && edad < 19)
    return { id: "avanzados_1", nombre: "Avanzados 1 (Junior ISU)" };
  if (edad >= 10 && edad < 16)
    return { id: "noviciados", nombre: "Noviciados (Advanced Novice ISU)" };
  // Menores del rango: pueden competir en categoría única "Abierto".
  if (edad >= 7)
    return {
      id: "novicios_abierto",
      nombre: "Novicios Abierto",
    };
  return { id: null, nombre: null };
}

/**
 * Calcula la categoría FEMEPASHIDI desde una fecha de nacimiento ISO
 * 'YYYY-MM-DD'. `ref` permite fijar la temporada (por defecto, hoy).
 * Devuelve null si la fecha es inválida o nula.
 */
export function calcularCategoria(
  iso: string | null,
  ref: Date = new Date(),
): Categoria | null {
  if (!iso) return null;
  const temporadaInicio = temporadaInicioEn(ref);
  const edad = edadAlCorte(iso, temporadaInicio);
  if (edad === null || edad < 0) return null;

  const categoriaEdad = categoriaEdadPara(edad);
  const isu = elegibilidadIsuPara(edad);

  return {
    temporadaInicio,
    temporada: `${temporadaInicio}/${temporadaInicio + 1}`,
    edadCorte: edad,
    categoriaEdad,
    elegibilidadIsu: isu.id,
    elegibilidadIsuNombre: isu.nombre,
  };
}

/** Etiqueta corta de la categoría de edad (para badges/columnas). */
export function categoriaEdadLabel(iso: string | null, ref?: Date): string {
  const c = calcularCategoria(iso, ref);
  return c ? c.categoriaEdad.nombre : "—";
}
