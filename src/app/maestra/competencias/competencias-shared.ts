// Helpers de presentación para Competencias.

// Formatea una fecha ISO 'YYYY-MM-DD' como dd/mm/aaaa (es-MX). La fecha es un
// date puro (sin hora); se interpreta en UTC para evitar corrimientos de día.
export function formatFecha(fechaISO: string | null): string {
  if (!fechaISO) return "Sin fecha";
  const d = new Date(`${fechaISO.slice(0, 10)}T00:00:00Z`);
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
