// Helpers de fecha solo-día (sin componente horario). Las fechas de la ficha
// (nacimiento, alta) se guardan como 'YYYY-MM-DD' y se muestran tal cual para
// evitar el desfase de zona horaria (medianoche UTC → día anterior en MX).

/** Formatea una fecha ISO 'YYYY-MM-DD' como dd/mm/aaaa. */
export function fechaDia(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Edad en años cumplidos a partir de una fecha ISO 'YYYY-MM-DD'. */
export function calcularEdad(iso: string | null): number | null {
  if (!iso) return null;
  const partes = iso.slice(0, 10).split("-");
  const y = Number(partes[0]);
  const m = Number(partes[1]);
  const d = Number(partes[2]);
  if (!y || !m || !d) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - y;
  const mes = hoy.getMonth() + 1 - m;
  if (mes < 0 || (mes === 0 && hoy.getDate() < d)) edad -= 1;
  return edad;
}

/** Antigüedad en meses completos desde una fecha ISO 'YYYY-MM-DD'. */
export function antiguedadMeses(iso: string | null): number | null {
  if (!iso) return null;
  const partes = iso.slice(0, 10).split("-");
  const y = Number(partes[0]);
  const m = Number(partes[1]);
  const d = Number(partes[2]);
  if (!y || !m || !d) return null;
  const hoy = new Date();
  let meses = (hoy.getFullYear() - y) * 12 + (hoy.getMonth() + 1 - m);
  if (hoy.getDate() < d) meses -= 1;
  return Math.max(0, meses);
}

/** Formatea una antigüedad en meses como "X años Y meses" / "Y meses". */
export function formatAntiguedad(iso: string | null): string {
  const meses = antiguedadMeses(iso);
  if (meses === null) return "—";
  const anios = Math.floor(meses / 12);
  const rem = meses % 12;
  if (anios === 0) return `${rem} ${rem === 1 ? "mes" : "meses"}`;
  const parteAnios = `${anios} ${anios === 1 ? "año" : "años"}`;
  if (rem === 0) return parteAnios;
  return `${parteAnios} ${rem} ${rem === 1 ? "mes" : "meses"}`;
}
