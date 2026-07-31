// Catálogo de temas (paletas) de CoachDeskmx. Fuente única para el selector de
// apariencia en Ajustes y la validación en el server action. Cada `TemaId`
// corresponde a un bloque CSS en globals.css (`:root` o `[data-theme="..."]`).
// `muestra` son hex sólo para pintar el swatch de vista previa (no afecta el
// render real, que usa las variables CSS).

export type TemaId = "hielo" | "menta" | "durazno" | "lila" | "cielo";

export const TEMA_DEFAULT: TemaId = "hielo";

export interface Tema {
  id: TemaId;
  nombre: string;
  descripcion: string;
  /** [fondo, acento, texto] para el swatch de vista previa. */
  muestra: [string, string, string];
}

export const TEMAS: Tema[] = [
  {
    id: "hielo",
    nombre: "Hielo",
    descripcion: "Fresco y limpio, azul patinaje.",
    muestra: ["#eef6fb", "#1390a8", "#10263a"],
  },
  {
    id: "menta",
    nombre: "Menta",
    descripcion: "Verdes frescos y relajados.",
    muestra: ["#ecf8f2", "#0fa678", "#12312a"],
  },
  {
    id: "durazno",
    nombre: "Durazno",
    descripcion: "Cálido y alegre, tono coral.",
    muestra: ["#fff3ec", "#ef7a4d", "#3a2016"],
  },
  {
    id: "lila",
    nombre: "Lila",
    descripcion: "Suave y divertido, lavanda.",
    muestra: ["#f4f0fb", "#7c5cdf", "#241a3a"],
  },
  {
    id: "cielo",
    nombre: "Cielo",
    descripcion: "Azul brillante y amigable.",
    muestra: ["#ecf3ff", "#2f6df0", "#122344"],
  },
];

const IDS = new Set<string>(TEMAS.map((t) => t.id));

export function esTemaValido(x: unknown): x is TemaId {
  return typeof x === "string" && IDS.has(x);
}

/** Normaliza un valor (posible null/inválido) a un TemaId seguro. */
export function normalizarTema(x: unknown): TemaId {
  return esTemaValido(x) ? x : TEMA_DEFAULT;
}
