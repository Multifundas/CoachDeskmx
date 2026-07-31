import "server-only";

// Cálculo del monto del cargo de clase según sede + horario.
// El costo/hora depende del tier de la sede (base / externa A / externa B) y se
// ajusta por los modificadores matutino/nocturna (%) definidos por sede. La franja
// se determina por la hora local del inicio de la ocurrencia.

import type { TierSede } from "@/types/domain";
import { partesLocales } from "@/lib/agenda-tz";
import { createClient } from "@/lib/supabase/server";

const CONCEPTO_POR_TIER: Record<TierSede, string> = {
  base: "costo_hora_base",
  externa_a: "costo_hora_externa_a",
  externa_b: "costo_hora_externa_b",
};

export interface TarifaResuelta {
  montoHora: number;
  tier: TierSede;
  conceptoClave: string;
  franja: "matutino" | "nocturna" | "normal";
  pctAplicado: number;
  horas: number;
  monto: number; // MXN, redondeado a 2 decimales
}

interface ConfigModificadores {
  matutinoPct: number;
  nocturnaPct: number;
  matutinoHasta: number;
  nocturnaDesde: number;
}

/**
 * Resuelve el monto (puro, sin BD) dado el costo/hora, la duración, la hora local
 * de inicio y la configuración de modificadores de la sede.
 */
export function resolverMonto(
  montoHora: number,
  horas: number,
  horaLocalInicio: number,
  cfg: ConfigModificadores,
): { franja: TarifaResuelta["franja"]; pctAplicado: number; monto: number } {
  let franja: TarifaResuelta["franja"] = "normal";
  let pctAplicado = 0;
  if (horaLocalInicio < cfg.matutinoHasta) {
    franja = "matutino";
    pctAplicado = cfg.matutinoPct;
  } else if (horaLocalInicio >= cfg.nocturnaDesde) {
    franja = "nocturna";
    pctAplicado = cfg.nocturnaPct;
  }
  const bruto = montoHora * horas * (1 + pctAplicado / 100);
  const monto = Math.round(bruto * 100) / 100;
  return { franja, pctAplicado, monto };
}

/**
 * Calcula el cargo de clase para una ocurrencia. Devuelve `null` si la sede es
 * null o no hay tarifa configurada para su tier (el llamador trata esto como
 * "sin cargo", no bloquea la asistencia).
 */
export async function calcularCargoClase(params: {
  sedeId: string | null;
  inicioUtc: string;
  finUtc: string;
  timezoneSede: string;
}): Promise<TarifaResuelta | null> {
  const { sedeId, inicioUtc, finUtc, timezoneSede } = params;
  if (!sedeId) return null;

  const supabase = createClient();

  const { data: config } = await supabase
    .from("sede_config")
    .select("tier_default, matutino_pct, nocturna_pct, matutino_hasta, nocturna_desde")
    .eq("sede_id", sedeId)
    .maybeSingle();

  const tier = (config?.tier_default ?? "base") as TierSede;

  const { data: tarifa } = await supabase
    .from("sede_tarifas")
    .select("monto_hora")
    .eq("sede_id", sedeId)
    .eq("tier", tier)
    .maybeSingle();

  if (!tarifa) return null;

  const montoHora = Number(tarifa.monto_hora);
  const inicioMs = new Date(inicioUtc).getTime();
  const finMs = new Date(finUtc).getTime();
  const horas = Math.max(0, (finMs - inicioMs) / 3_600_000);

  const horaLocalInicio = partesLocales(new Date(inicioUtc), timezoneSede).hora;

  const cfg: ConfigModificadores = {
    matutinoPct: Number(config?.matutino_pct ?? 0),
    nocturnaPct: Number(config?.nocturna_pct ?? 0),
    matutinoHasta: Number(config?.matutino_hasta ?? 12),
    nocturnaDesde: Number(config?.nocturna_desde ?? 18),
  };

  const { franja, pctAplicado, monto } = resolverMonto(
    montoHora,
    horas,
    horaLocalInicio,
    cfg,
  );

  return {
    montoHora,
    tier,
    conceptoClave: CONCEPTO_POR_TIER[tier],
    franja,
    pctAplicado,
    horas,
    monto,
  };
}
