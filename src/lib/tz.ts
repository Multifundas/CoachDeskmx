// Helpers de zona horaria.
// Regla del proyecto: se almacena SIEMPRE en UTC en la base de datos y se
// resuelve contra la zona horaria de la sede al presentar/programar.

export const DEFAULT_TZ =
  process.env.NEXT_PUBLIC_DEFAULT_TZ ?? "America/Mexico_City";

/** Formatea una fecha UTC en la zona horaria de una sede (dd/mm/aaaa hh:mm). */
export function formatEnSede(
  fechaUtc: Date | string,
  timeZone: string = DEFAULT_TZ,
): string {
  const d = typeof fechaUtc === "string" ? new Date(fechaUtc) : fechaUtc;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Formatea solo la fecha (dd/mm/aaaa) en la zona horaria dada. */
export function formatFecha(
  fecha: Date | string,
  timeZone: string = DEFAULT_TZ,
): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
