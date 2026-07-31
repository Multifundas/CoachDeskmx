import "server-only";

// Data layer de tarifas por sede (costo/hora por tier) y su configuración de
// modificadores (matutino/nocturna %). Para el formulario de Ajustes.
import type { TierSede } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

export interface SedeTarifasFila {
  sedeId: string;
  nombre: string;
  activa: boolean;
  // monto por tier (null = sin configurar).
  montoPorTier: Record<TierSede, number | null>;
  tierDefault: TierSede;
  matutinoPct: number;
  nocturnaPct: number;
  matutinoHasta: number;
  nocturnaDesde: number;
}

const TIERS: TierSede[] = ["base", "externa_a", "externa_b"];

export async function listarSedeTarifas(): Promise<SedeTarifasFila[]> {
  const supabase = createClient();

  const [{ data: sedes }, { data: tarifas }, { data: configs }] =
    await Promise.all([
      supabase
        .from("sedes")
        .select("id, nombre, activa")
        .order("activa", { ascending: false })
        .order("nombre", { ascending: true }),
      supabase.from("sede_tarifas").select("sede_id, tier, monto_hora"),
      supabase
        .from("sede_config")
        .select(
          "sede_id, tier_default, matutino_pct, nocturna_pct, matutino_hasta, nocturna_desde",
        ),
    ]);

  interface Sede {
    id: string;
    nombre: string;
    activa: boolean;
  }
  interface Tarifa {
    sede_id: string;
    tier: TierSede;
    monto_hora: number;
  }
  interface Config {
    sede_id: string;
    tier_default: TierSede;
    matutino_pct: number;
    nocturna_pct: number;
    matutino_hasta: number;
    nocturna_desde: number;
  }

  const tarifasArr = (tarifas ?? []) as unknown as Tarifa[];
  const configsArr = (configs ?? []) as unknown as Config[];
  const tarifaMap = new Map<string, Map<TierSede, number>>();
  for (const t of tarifasArr) {
    const m = tarifaMap.get(t.sede_id) ?? new Map<TierSede, number>();
    m.set(t.tier, Number(t.monto_hora));
    tarifaMap.set(t.sede_id, m);
  }
  const configMap = new Map<string, Config>();
  for (const c of configsArr) configMap.set(c.sede_id, c);

  return ((sedes ?? []) as unknown as Sede[]).map((s) => {
    const m = tarifaMap.get(s.id);
    const cfg = configMap.get(s.id);
    const montoPorTier = Object.fromEntries(
      TIERS.map((tier) => [tier, m?.get(tier) ?? null]),
    ) as Record<TierSede, number | null>;
    return {
      sedeId: s.id,
      nombre: s.nombre,
      activa: s.activa,
      montoPorTier,
      tierDefault: cfg?.tier_default ?? "base",
      matutinoPct: Number(cfg?.matutino_pct ?? 0),
      nocturnaPct: Number(cfg?.nocturna_pct ?? 0),
      matutinoHasta: Number(cfg?.matutino_hasta ?? 12),
      nocturnaDesde: Number(cfg?.nocturna_desde ?? 18),
    };
  });
}
