// Tipos de dominio de la UI (Fase 2, con mocks tipados).
// Reflejan el esquema SQL de Fase 1. Cuando se conecte Supabase real, estos
// tipos se alinean con los generados en types/database.ts.

import type { TemaId } from "@/lib/temas";

export type RolApp =
  | "super_admin"
  | "maestra"
  | "coach_asistente"
  | "tutor"
  | "alumna";

export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  timezoneDefault: string;
}

export interface Sesion {
  userId: string;
  nombre: string;
  email: string;
  rol: RolApp;
  tenantId: string | null; // null para tutor/alumna sin tenant propio
  tenantNombre: string | null;
  tema: TemaId; // paleta elegida por el usuario (default aplicado en getSesion)
}

// ---- Identidad global -------------------------------------------------------
export type SexoPersona = "f" | "m" | "x";

export type Parentesco =
  | "madre"
  | "padre"
  | "tutor_legal"
  | "abuelo"
  | "otro"
  | "la_misma";

export interface Persona {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string | null; // ISO date
  nivelActual: string | null;
}

// ---- Inscripción (por tenant) ----------------------------------------------
export type EstadoInscripcion = "activa" | "pausada" | "baja";

export interface Inscripcion {
  id: string;
  tenantId: string;
  persona: Persona;
  estado: EstadoInscripcion;
  fechaAlta: string; // ISO date
  saldoMxn: number; // saldo pendiente (positivo = debe)
}

// ---- Agenda -----------------------------------------------------------------
export type EstadoEvento = "activo" | "cancelado";

export type TipoEvento =
  | "clase"
  | "competencia"
  | "examen"
  | "evento"
  | "otro";

export type EstadoAsistencia =
  | "presente"
  | "ausente"
  | "justificada"
  | "sin_marcar";

// Día de la semana, 0=domingo … 6=sábado (igual que Date.getDay / bloques_hielo).
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface EventoOcurrencia {
  id: string;
  tenantId: string;
  titulo: string;
  sede: string;
  inicioUtc: string; // ISO datetime UTC
  finUtc: string;
  timezoneSede: string;
  estado: EstadoEvento;
}

// Ocurrencia enriquecida para la Agenda (join evento + sede).
export interface OcurrenciaAgenda {
  ocurrenciaId: string;
  eventoId: string;
  titulo: string;
  tipo: TipoEvento;
  inicioUtc: string; // ISO datetime UTC
  finUtc: string;
  estado: EstadoEvento; // estado de la ocurrencia
  esSerie: boolean; // el evento tiene rrule
  sedeId: string | null;
  sedeNombre: string | null;
  timezoneSede: string; // TZ efectiva (sede o default del tenant)
}

export interface SedeOpcion {
  id: string;
  nombre: string;
  timezone: string;
}

// ---- Cobranza ---------------------------------------------------------------
export type EstadoCargo =
  | "pendiente"
  | "pagado"
  | "parcial"
  | "cancelado"
  | "en_corte";

export type OrigenCargo =
  | "clase"
  | "cancelacion"
  | "inscripcion"
  | "competencia"
  | "manual";

export interface Cargo {
  id: string;
  tenantId: string;
  inscripcionId: string;
  concepto: string;
  montoMxn: number;
  periodo: string; // 'YYYY-MM'
  estado: EstadoCargo;
}

// Fila de cargo enriquecida para la tabla de Cobranza (join alumna + concepto).
export interface CargoFila {
  id: string;
  inscripcionId: string;
  alumna: string;
  concepto: string;
  periodo: string | null; // 'YYYY-MM'
  origen: OrigenCargo;
  monto: number; // MXN (importe completo del cargo)
  saldo: number; // MXN pendiente (monto - suma de aplicaciones de pago)
  estado: EstadoCargo;
}

// Tier de tarifa por hora de una sede.
export type TierSede = "base" | "externa_a" | "externa_b";

export type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "otro";

// Concepto del catálogo (para Ajustes) con su precio vigente.
export interface ConceptoFila {
  id: string;
  clave: string;
  nombre: string;
  tipo: string; // tipo_concepto
  activo: boolean;
  precioVigente: number | null; // MXN vigente hoy, null si no hay precio
  esModificador: boolean; // claves con prefijo 'mod_' (matutino/nocturna %)
}

// Fila de estado de cuenta (sellado) para listado.
export interface EdcFila {
  id: string;
  folio: string;
  periodo: string; // 'YYYY-MM'
  total: number; // MXN
  inscripcionId: string;
  alumna: string;
  selladoAtUtc: string;
}

// Opción de alumna inscrita (para selects de cobranza / cortes).
export interface AlumnaOpcion {
  inscripcionId: string;
  nombre: string;
}

// ---- Competencias -----------------------------------------------------------
export interface Competencia {
  id: string;
  nombre: string;
  sede: string | null;
  fecha: string | null; // ISO date
  inscritas: number; // conteo de alumnas inscritas
}

// Nivel de la temporada activa (para selects y tabla de tarifas).
export interface NivelOpcion {
  id: string;
  nombre: string;
  rama: string; // 'infantil' | 'adulto' | 'parejas'
  orden: number;
}

// Alumna inscrita a una competencia (con su nivel y categoría).
export interface CompetenciaInscripcionFila {
  id: string; // id de competencia_inscripciones
  inscripcionId: string;
  nombre: string;
  nivelId: string | null;
  nivelNombre: string | null;
  categoria: string | null;
}

// Tarifa de coacheo por nivel (nivel LEFT JOIN tarifa del tenant).
export interface TarifaNivel {
  nivelId: string;
  nivelNombre: string;
  rama: string;
  orden: number;
  monto: number | null; // null = sin tarifa configurada
}
