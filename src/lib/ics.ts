// Generador de feed iCalendar (RFC 5545) para suscripción de solo-lectura desde
// Google Calendar / Apple Calendar. No depende de Supabase: recibe eventos ya
// resueltos y devuelve el texto VCALENDAR listo para servir como text/calendar.

export interface EventoICS {
  uid: string;
  seq: number;
  titulo: string;
  inicioUtc: string; // ISO 8601
  finUtc: string; // ISO 8601
  rrule: string | null;
  cancelado: boolean;
}

// Escapa un valor de texto según RFC 5545 (comas, punto y coma, barra y saltos).
function escaparTexto(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Formatea una fecha ISO a UTC compacto 'YYYYMMDDTHHMMSSZ'.
function aUtcCompacto(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

// Plegado de líneas a 75 octetos (RFC 5545 §3.1): las continuaciones empiezan
// con un espacio. Se cuenta por bytes UTF-8 para no partir un carácter.
function plegar(linea: string): string {
  const bytes = Buffer.from(linea, "utf8");
  if (bytes.length <= 75) return linea;

  const partes: string[] = [];
  let inicio = 0;
  let limite = 75;
  while (inicio < bytes.length) {
    // Retrocede el corte hasta no partir un carácter multibyte (0b10xxxxxx).
    let fin = Math.min(inicio + limite, bytes.length);
    while (fin < bytes.length && (bytes[fin]! & 0xc0) === 0x80) fin--;
    partes.push(bytes.subarray(inicio, fin).toString("utf8"));
    inicio = fin;
    limite = 74; // las líneas de continuación llevan un espacio inicial (1 octeto)
  }
  return partes.join("\r\n ");
}

/**
 * Construye el documento VCALENDAR completo. Las líneas se separan con CRLF y se
 * pliegan a 75 octetos. Eventos cancelados salen con STATUS:CANCELLED (para que
 * el calendario suscrito los retire). Si hay RRULE se incluye tal cual.
 */
export function generarICS(eventos: EventoICS[]): string {
  const ahora = aUtcCompacto(new Date().toISOString());
  const lineas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CoachDesk//Agenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:CoachDesk",
  ];

  for (const e of eventos) {
    lineas.push("BEGIN:VEVENT");
    lineas.push(`UID:${escaparTexto(e.uid)}`);
    lineas.push(`SEQUENCE:${Number.isFinite(e.seq) ? e.seq : 0}`);
    lineas.push(`DTSTAMP:${ahora}`);
    lineas.push(`DTSTART:${aUtcCompacto(e.inicioUtc)}`);
    lineas.push(`DTEND:${aUtcCompacto(e.finUtc)}`);
    lineas.push(`SUMMARY:${escaparTexto(e.titulo)}`);
    if (e.rrule) lineas.push(`RRULE:${e.rrule}`);
    lineas.push(`STATUS:${e.cancelado ? "CANCELLED" : "CONFIRMED"}`);
    lineas.push("END:VEVENT");
  }

  lineas.push("END:VCALENDAR");
  return lineas.map(plegar).join("\r\n") + "\r\n";
}
