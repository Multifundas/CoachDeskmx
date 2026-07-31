// Cálculo de rangos de fecha para las vistas de la Agenda (lista/mes/semana).
// Trabaja en horario local del navegador/servidor a nivel de día; como el
// filtrado real es por inicio_utc, ampliamos un poco los bordes para no perder
// ocurrencias por diferencias de zona horaria.

export type VistaAgenda = "lista" | "mes" | "semana";

export function esVista(v: string): v is VistaAgenda {
  return v === "lista" || v === "mes" || v === "semana";
}

/** Fecha 'YYYY-MM-DD' de referencia; hoy si no es válida. */
export function refDia(ref?: string): { y: number; m: number; d: number } {
  const hoy = new Date();
  if (ref && /^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    const [y, m, d] = ref.split("-").map(Number);
    return { y: y!, m: m!, d: d! };
  }
  return { y: hoy.getFullYear(), m: hoy.getMonth() + 1, d: hoy.getDate() };
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface RangoAgenda {
  desdeUtc: string;
  hastaUtc: string;
  // Fechas ancla para navegación previa/siguiente y para render de la vista.
  refISO: string;
  prevISO: string;
  nextISO: string;
  etiqueta: string;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Rango [desdeUtc, hastaUtc) según la vista. Se usa UTC a medianoche con un
 * colchón de ±1 día para cubrir el offset de México (nunca perdemos eventos;
 * las vistas filtran/agrupan por fecha local exacta al renderizar).
 */
export function calcularRango(vista: VistaAgenda, refISO?: string): RangoAgenda {
  const { y, m, d } = refDia(refISO);
  const ref = new Date(Date.UTC(y, m - 1, d));

  if (vista === "semana") {
    // Semana lunes-domingo que contiene ref.
    const dow = (ref.getUTCDay() + 6) % 7; // 0=lunes
    const inicio = new Date(ref);
    inicio.setUTCDate(ref.getUTCDate() - dow);
    const fin = new Date(inicio);
    fin.setUTCDate(inicio.getUTCDate() + 7);
    const prev = new Date(inicio);
    prev.setUTCDate(inicio.getUTCDate() - 7);
    const next = new Date(inicio);
    next.setUTCDate(inicio.getUTCDate() + 7);
    return {
      desdeUtc: conColchon(inicio, -1),
      hastaUtc: conColchon(fin, 1),
      refISO: isoDe(inicio),
      prevISO: isoDe(prev),
      nextISO: isoDe(next),
      etiqueta: `Semana del ${inicio.getUTCDate()} de ${MESES[inicio.getUTCMonth()]}`,
    };
  }

  if (vista === "mes") {
    const inicio = new Date(Date.UTC(y, m - 1, 1));
    const fin = new Date(Date.UTC(y, m, 1));
    const prev = new Date(Date.UTC(y, m - 2, 1));
    const next = new Date(Date.UTC(y, m, 1));
    return {
      desdeUtc: conColchon(inicio, -1),
      hastaUtc: conColchon(fin, 1),
      refISO: isoDe(inicio),
      prevISO: isoDe(prev),
      nextISO: isoDe(next),
      etiqueta: `${MESES[m - 1]![0]!.toUpperCase()}${MESES[m - 1]!.slice(1)} ${y}`,
    };
  }

  // lista: 30 días desde ref.
  const inicio = new Date(ref);
  const fin = new Date(ref);
  fin.setUTCDate(ref.getUTCDate() + 30);
  const prev = new Date(ref);
  prev.setUTCDate(ref.getUTCDate() - 30);
  const next = new Date(ref);
  next.setUTCDate(ref.getUTCDate() + 30);
  return {
    desdeUtc: conColchon(inicio, -1),
    hastaUtc: conColchon(fin, 1),
    refISO: isoDe(inicio),
    prevISO: isoDe(prev),
    nextISO: isoDe(next),
    etiqueta: "Próximos 30 días",
  };
}

function isoDe(d: Date): string {
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function conColchon(d: Date, dias: number): string {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + dias);
  return x.toISOString();
}
