// Calendario oficial FEMEPASHIDI — Temporada 2026/2027.
// Transcripción del calendario compartido por la usuaria (imagen). Sirve para
// pre-llenar el editor de importación en /maestra/competencias/importar.
//
// Notas de transcripción:
//  - `fecha` usa el PRIMER día del rango (ISO 'YYYY-MM-DD').
//  - `sede` = null cuando el calendario dice "POR CONFIRMAR".
//  - `tipo` clasifica la fila para agrupar/filtrar en el editor. NO se persiste;
//    todas las filas se crean como competencias (registro + evento espejo).
//  - Las "SESIÓN DE EXÁMENES" que acompañan a una copa se listan aparte solo si
//    aparecen como fila propia con fecha distinta; cuando comparten día con la
//    copa se omiten para no duplicar (van implícitas en la copa).

export type TipoFilaCalendario = "copa" | "examen" | "isu" | "qualifying";

export interface FilaCalendario {
  nombre: string;
  fecha: string; // ISO 'YYYY-MM-DD' (primer día del rango)
  sede: string | null; // null = por confirmar
  tipo: TipoFilaCalendario;
}

// Orden cronológico. Temporada agosto 2026 → mayo 2027.
export const CALENDARIO_FEMEPASHIDI_2026_2027: FilaCalendario[] = [
  // ---- AGOSTO 2026 ----------------------------------------------------------
  {
    nombre: "Sesión de exámenes todos los niveles",
    fecha: "2026-08-15",
    sede: "Santa Fe, CDMX",
    tipo: "examen",
  },
  {
    nombre: "Sesión de exámenes todos los niveles",
    fecha: "2026-08-16",
    sede: "Winter Sports, Metepec",
    tipo: "examen",
  },
  {
    nombre: "ISU Junior Grand Prix",
    fecha: "2026-08-26",
    sede: "Latvia",
    tipo: "isu",
  },

  // ---- SEPTIEMBRE 2026 ------------------------------------------------------
  {
    nombre: "2nd Independence Open Championships 2026 — Qualifying Event",
    fecha: "2026-09-14",
    sede: null,
    tipo: "qualifying",
  },
  {
    nombre: "Copa San Agustín",
    fecha: "2026-09-24",
    sede: "Deportivo San Agustín",
    tipo: "copa",
  },

  // ---- OCTUBRE 2026 ---------------------------------------------------------
  {
    nombre: "Copa Coyoacán",
    fecha: "2026-10-01",
    sede: "La Pista Coyoacán",
    tipo: "copa",
  },
  {
    nombre: "Copa Icegalerie",
    fecha: "2026-10-08",
    sede: "Mérida, Yucatán",
    tipo: "copa",
  },
  {
    nombre: "ISU Junior Grand Prix",
    fecha: "2026-10-07",
    sede: "Polonia",
    tipo: "isu",
  },
  {
    nombre: "Copa Alpino",
    fecha: "2026-10-16",
    sede: "Alpino, Monterrey",
    tipo: "copa",
  },
  {
    nombre: "Copa Santa Fe",
    fecha: "2026-10-21",
    sede: "Santa Fe",
    tipo: "copa",
  },
  {
    nombre: "4 Latin American Regional Interclub F.S.C. 2026",
    fecha: "2026-10-30",
    sede: "Ice Brasil, Brasil",
    tipo: "isu",
  },

  // ---- NOVIEMBRE 2026 -------------------------------------------------------
  {
    nombre: "Copa Lakeside",
    fecha: "2026-11-05",
    sede: "Lakeside, Querétaro",
    tipo: "copa",
  },
  {
    nombre: "11th Mexican Open Skating Competition 2026 — Qualifying Event",
    fecha: "2026-11-23",
    sede: null,
    tipo: "qualifying",
  },
  {
    nombre: "Mexico Cup 2026 — International & Qualifying Event",
    fecha: "2026-11-23",
    sede: null,
    tipo: "qualifying",
  },

  // ---- DICIEMBRE 2026 -------------------------------------------------------
  {
    nombre: "Copa Ice Town",
    fecha: "2026-12-04",
    sede: "Ice Town, Zona Esmeralda",
    tipo: "copa",
  },

  // ---- ENERO 2027 -----------------------------------------------------------
  {
    nombre: "Copa Fundidora",
    fecha: "2027-01-14",
    sede: "Fundidora, Monterrey",
    tipo: "copa",
  },
  {
    nombre: "Copa Tabasco",
    fecha: "2027-01-21",
    sede: "Villahermosa",
    tipo: "copa",
  },
  {
    nombre: "Copa Interlomas",
    fecha: "2027-01-27",
    sede: "SK8 Interlomas",
    tipo: "copa",
  },

  // ---- FEBRERO 2027 ---------------------------------------------------------
  {
    nombre: "Copa Uptown",
    fecha: "2027-02-03",
    sede: "Uptown, Querétaro",
    tipo: "copa",
  },
  {
    nombre: "Four Continents Championships 2027",
    fecha: "2027-02-09",
    sede: "Astana, Kaz",
    tipo: "isu",
  },
  {
    nombre: "XXIV Hielojuegos Nacionales — Qualifying Event",
    fecha: "2027-02-22",
    sede: null,
    tipo: "qualifying",
  },

  // ---- MARZO 2027 -----------------------------------------------------------
  {
    nombre: "Copa La Noria",
    fecha: "2027-03-11",
    sede: "La Noria, Puebla",
    tipo: "copa",
  },
  {
    nombre: "ISU World Championships",
    fecha: "2027-03-15",
    sede: "Tampere, Fin",
    tipo: "isu",
  },

  // ---- ABRIL 2027 -----------------------------------------------------------
  {
    nombre: "Copa Buenavista",
    fecha: "2027-04-02",
    sede: "Buenavista",
    tipo: "copa",
  },
  {
    nombre: "Copa Eden Ice y Copa Adultos",
    fecha: "2027-04-09",
    sede: "Eden Ice, Querétaro",
    tipo: "copa",
  },
  {
    nombre: "Copa de la Amistad",
    fecha: "2027-04-16",
    sede: "Ice Arena, Puebla",
    tipo: "copa",
  },
  {
    nombre: "Campeonato Estatal Nuevo León",
    fecha: "2027-04-22",
    sede: "Fundidora, Monterrey",
    tipo: "copa",
  },
  {
    nombre: "14 Copa Metepec",
    fecha: "2027-04-29",
    sede: "Winter Sports, Metepec",
    tipo: "copa",
  },

  // ---- MAYO 2027 ------------------------------------------------------------
  {
    nombre: "XL Campeonato Nacional 2027",
    fecha: "2027-05-17",
    sede: null,
    tipo: "qualifying",
  },
];
