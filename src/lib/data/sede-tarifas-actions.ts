"use server";

// Acciones para tarifas por sede (costo/hora por tier) y su configuración de
// modificadores. Upsert masivo desde el formulario de Ajustes.
import { revalidatePath } from "next/cache";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { TierSede } from "@/types/domain";

export interface SedeTarifasState {
  error: string | null;
  ok: boolean;
}

const TIERS: TierSede[] = ["base", "externa_a", "externa_b"];

/**
 * Guarda, para cada sede presente en el form, sus tres tarifas por tier y su
 * configuración (tier_default + modificadores). Inputs:
 *   tarifa_<sedeId>_<tier>, tier_default_<sedeId>, matutino_pct_<sedeId>,
 *   nocturna_pct_<sedeId>, matutino_hasta_<sedeId>, nocturna_desde_<sedeId>.
 */
export async function guardarTarifasSede(
  _prev: SedeTarifasState,
  formData: FormData,
): Promise<SedeTarifasState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;
  const supabase = createClient();

  // Descubrir las sedes involucradas por los campos tier_default_<sedeId>.
  const sedeIds = new Set<string>();
  for (const key of formData.keys()) {
    if (key.startsWith("tier_default_")) {
      sedeIds.add(key.slice("tier_default_".length));
    }
  }

  const tarifas: {
    tenant_id: string;
    sede_id: string;
    tier: TierSede;
    monto_hora: number;
  }[] = [];
  const configs: {
    tenant_id: string;
    sede_id: string;
    tier_default: TierSede;
    matutino_pct: number;
    nocturna_pct: number;
    matutino_hasta: number;
    nocturna_desde: number;
  }[] = [];

  const num = (v: FormDataEntryValue | null): number | null => {
    const raw = String(v ?? "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  for (const sedeId of sedeIds) {
    for (const tier of TIERS) {
      const monto = num(formData.get(`tarifa_${sedeId}_${tier}`));
      if (monto === null) continue;
      if (monto < 0) {
        return { error: "Las tarifas deben ser >= 0.", ok: false };
      }
      tarifas.push({ tenant_id: tenantId, sede_id: sedeId, tier, monto_hora: monto });
    }

    const tierDefaultRaw = String(
      formData.get(`tier_default_${sedeId}`) ?? "base",
    );
    const tierDefault = (TIERS as string[]).includes(tierDefaultRaw)
      ? (tierDefaultRaw as TierSede)
      : "base";
    const matPct = num(formData.get(`matutino_pct_${sedeId}`)) ?? 0;
    const nocPct = num(formData.get(`nocturna_pct_${sedeId}`)) ?? 0;
    const matHasta = num(formData.get(`matutino_hasta_${sedeId}`)) ?? 12;
    const nocDesde = num(formData.get(`nocturna_desde_${sedeId}`)) ?? 18;
    if (matHasta < 0 || matHasta > 24 || nocDesde < 0 || nocDesde > 24) {
      return { error: "Las horas de franja deben estar entre 0 y 24.", ok: false };
    }
    configs.push({
      tenant_id: tenantId,
      sede_id: sedeId,
      tier_default: tierDefault,
      matutino_pct: matPct,
      nocturna_pct: nocPct,
      matutino_hasta: matHasta,
      nocturna_desde: nocDesde,
    });
  }

  if (tarifas.length > 0) {
    const { error } = await supabase
      .from("sede_tarifas")
      .upsert(tarifas, { onConflict: "tenant_id,sede_id,tier" });
    if (error) {
      return { error: "No se pudieron guardar las tarifas.", ok: false };
    }
  }

  if (configs.length > 0) {
    const { error } = await supabase
      .from("sede_config")
      .upsert(configs, { onConflict: "tenant_id,sede_id" });
    if (error) {
      return { error: "No se pudo guardar la configuración de sede.", ok: false };
    }
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}
