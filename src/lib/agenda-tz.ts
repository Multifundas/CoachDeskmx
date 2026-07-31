// Utilidades de zona horaria para la Agenda, sin librerías externas.
//
// Todo se guarda en UTC en la BD (columnas *_utc). La maestra piensa en hora
// local de la sede (p.ej. "lunes 16:00 en CDMX"). Estas funciones convierten
// entre hora local de una IANA timezone y el instante UTC, manejando DST vía
// `Intl.DateTimeFormat` (sin números mágicos de offset).

import type { DiaSemana } from "@/types/domain";

/**
 * Offset en minutos de una IANA timezone para un instante UTC dado.
 * Positivo = la hora local va por delante de UTC (no ocurre en México, pero se
 * mantiene general). Para MX devuelve negativo (p.ej. -360 en CDMX invierno).
 */
export function offsetMinutos(fechaUtc: Date, timeZone: string): number {
  // Formatea el instante en la TZ objetivo y reconstruye la hora local como si
  // fuera UTC; la diferencia con el instante real es el offset.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const partes = dtf.formatToParts(fechaUtc);
  const map: Record<string, number> = {};
  for (const p of partes) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const comoUtc = Date.UTC(
    map.year!,
    (map.month ?? 1) - 1,
    map.day!,
    map.hour!,
    map.minute!,
    map.second ?? 0,
  );
  return Math.round((comoUtc - fechaUtc.getTime()) / 60000);
}

/**
 * Convierte una fecha 'YYYY-MM-DD' + hora 'HH:MM' interpretadas en `timeZone`
 * al instante UTC (Date). Maneja DST resolviendo el offset en dos pasos
 * (el offset del instante candidato puede diferir cerca de un cambio de hora).
 */
export function horaLocalAUtc(
  fechaISO: string,
  horaHHMM: string,
  timeZone: string,
): Date {
  const [y, m, d] = fechaISO.slice(0, 10).split("-").map(Number);
  const [hh, mm] = horaHHMM.split(":").map(Number);

  // Instante candidato tratando la hora local como si fuera UTC.
  const utcTentativo = Date.UTC(y!, (m ?? 1) - 1, d!, hh ?? 0, mm ?? 0, 0);
  // El offset en ese instante nos acerca; recalculamos una vez para afinar DST.
  const off1 = offsetMinutos(new Date(utcTentativo), timeZone);
  const utc1 = utcTentativo - off1 * 60000;
  const off2 = offsetMinutos(new Date(utc1), timeZone);
  const utc2 = utcTentativo - off2 * 60000;
  return new Date(utc2);
}

/** Partes de la hora local (en `timeZone`) de un instante UTC. */
export function partesLocales(
  fechaUtc: Date,
  timeZone: string,
): { anio: number; mes: number; dia: number; hora: number; minuto: number; diaSemana: DiaSemana } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(fechaUtc)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const semana: Record<string, DiaSemana> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    anio: Number(map.year),
    mes: Number(map.month),
    dia: Number(map.day),
    hora: Number(map.hour),
    minuto: Number(map.minute),
    diaSemana: semana[map.weekday ?? "Sun"] ?? 0,
  };
}

/** Formatea la hora local 'HH:MM' de un instante UTC en `timeZone`. */
export function horaLocal(fechaUtc: Date | string, timeZone: string): string {
  const d = typeof fechaUtc === "string" ? new Date(fechaUtc) : fechaUtc;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** Fecha local 'YYYY-MM-DD' de un instante UTC en `timeZone`. */
export function fechaLocalISO(fechaUtc: Date | string, timeZone: string): string {
  const d = typeof fechaUtc === "string" ? new Date(fechaUtc) : fechaUtc;
  const p = partesLocales(d, timeZone);
  const mm = String(p.mes).padStart(2, "0");
  const dd = String(p.dia).padStart(2, "0");
  return `${p.anio}-${mm}-${dd}`;
}

/**
 * Genera un UID estable para un evento (columna `eventos.uid`, requerida y única,
 * usada como identificador del feed ICS). Formato domain-like recomendado por
 * iCalendar: `<uuid>@coachdesk`.
 */
export function nuevoUidEvento(): string {
  return `${crypto.randomUUID()}@coachdesk`;
}

const LIMITE_OCURRENCIAS = 400;

export interface OcurrenciaExpandida {
  inicioUtc: string;
  finUtc: string;
}

/**
 * Expande una clase semanal recurrente. Desde `fechaInicioISO`, para cada día de
 * la semana en `dias`, genera ocurrencias con hora `horaInicio`–`horaFin`
 * (local a `timeZone`) hasta `fechaFinISO` inclusive. Tope defensivo de 400.
 */
export function expandirSemanal(params: {
  fechaInicioISO: string;
  fechaFinISO: string;
  dias: DiaSemana[];
  horaInicio: string; // 'HH:MM'
  horaFin: string; // 'HH:MM'
  timeZone: string;
}): OcurrenciaExpandida[] {
  const { fechaInicioISO, fechaFinISO, dias, horaInicio, horaFin, timeZone } =
    params;
  const set = new Set(dias);
  if (set.size === 0) return [];

  const out: OcurrenciaExpandida[] = [];
  // Iteramos por día de calendario usando UTC mediodía para evitar cruces de día.
  const [y0, m0, d0] = fechaInicioISO.slice(0, 10).split("-").map(Number);
  const [y1, m1, d1] = fechaFinISO.slice(0, 10).split("-").map(Number);
  let cursor = Date.UTC(y0!, (m0 ?? 1) - 1, d0!, 12, 0, 0);
  const fin = Date.UTC(y1!, (m1 ?? 1) - 1, d1!, 12, 0, 0);

  while (cursor <= fin && out.length < LIMITE_OCURRENCIAS) {
    const dd = new Date(cursor);
    // Día de la semana en UTC (mediodía evita ambigüedad por TZ).
    const diaSemana = dd.getUTCDay() as DiaSemana;
    if (set.has(diaSemana)) {
      const fechaISO = `${dd.getUTCFullYear()}-${String(
        dd.getUTCMonth() + 1,
      ).padStart(2, "0")}-${String(dd.getUTCDate()).padStart(2, "0")}`;
      const inicio = horaLocalAUtc(fechaISO, horaInicio, timeZone);
      const finOc = horaLocalAUtc(fechaISO, horaFin, timeZone);
      out.push({ inicioUtc: inicio.toISOString(), finUtc: finOc.toISOString() });
    }
    cursor += 24 * 60 * 60 * 1000;
  }
  return out;
}

const DIA_RRULE: Record<DiaSemana, string> = {
  0: "SU",
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
};

/**
 * Construye una RRULE iCalendar semanal. `fechaFinISO` marca el UNTIL (fin de
 * día, 23:59:59Z aproximado; suficiente como metadato — la verdad son las
 * ocurrencias materializadas).
 */
export function construirRRULE(dias: DiaSemana[], fechaFinISO: string): string {
  if (dias.length === 0) return "";
  const byday = dias
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DIA_RRULE[d])
    .join(",");
  const until = `${fechaFinISO.slice(0, 10).replace(/-/g, "")}T235959Z`;
  return `FREQ=WEEKLY;BYDAY=${byday};UNTIL=${until}`;
}
