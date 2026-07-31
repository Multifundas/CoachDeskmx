"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  guardarTarifasSede,
  type SedeTarifasState,
} from "@/lib/data/sede-tarifas-actions";
import type { SedeTarifasFila } from "@/lib/data/sede-tarifas";
import type { TierSede } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SedeTarifasState = { error: null, ok: false };

const TIER_LABEL: Record<TierSede, string> = {
  base: "Pista Base",
  externa_a: "Pista Externa A",
  externa_b: "Pista Externa B",
};

const TIERS: TierSede[] = ["base", "externa_a", "externa_b"];

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar tarifas"}
    </Button>
  );
}

function CampoMoneda({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: number | null;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-filo">
        $
      </span>
      <Input
        id={id}
        name={name}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        defaultValue={defaultValue ?? ""}
        placeholder="0.00"
        className="pl-7"
      />
    </div>
  );
}

export function TarifasSedeForm({ sedes }: { sedes: SedeTarifasFila[] }) {
  const [state, formAction] = useFormState(guardarTarifasSede, initialState);

  if (sedes.length === 0) {
    return (
      <p className="text-sm text-filo">
        No hay pistas registradas. Agrega una pista primero.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {sedes.map((s) => (
        <div
          key={s.sedeId}
          className="space-y-4 rounded-lg border border-filo/15 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-tinta">{s.nombre}</p>
            {!s.activa ? (
              <span className="text-xs text-filo">Archivada</span>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {TIERS.map((tier) => (
              <div key={tier} className="space-y-1.5">
                <Label htmlFor={`tarifa_${s.sedeId}_${tier}`}>
                  {TIER_LABEL[tier]}{" "}
                  <span className="text-xs text-filo">$/hora</span>
                </Label>
                <CampoMoneda
                  id={`tarifa_${s.sedeId}_${tier}`}
                  name={`tarifa_${s.sedeId}_${tier}`}
                  defaultValue={s.montoPorTier[tier]}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`tier_default_select_${s.sedeId}`}>
                Tier por defecto
              </Label>
              <select
                id={`tier_default_select_${s.sedeId}`}
                name={`tier_default_${s.sedeId}`}
                defaultValue={s.tierDefault}
                className={selectClass}
              >
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {TIER_LABEL[tier]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`matutino_pct_${s.sedeId}`}>
                Matutino %{" "}
                <span className="text-xs text-filo">(± ajuste)</span>
              </Label>
              <Input
                id={`matutino_pct_${s.sedeId}`}
                name={`matutino_pct_${s.sedeId}`}
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={s.matutinoPct}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`nocturna_pct_${s.sedeId}`}>
                Nocturna %{" "}
                <span className="text-xs text-filo">(± ajuste)</span>
              </Label>
              <Input
                id={`nocturna_pct_${s.sedeId}`}
                name={`nocturna_pct_${s.sedeId}`}
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={s.nocturnaPct}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`matutino_hasta_${s.sedeId}`}>
                Matutino hasta (hora)
              </Label>
              <Input
                id={`matutino_hasta_${s.sedeId}`}
                name={`matutino_hasta_${s.sedeId}`}
                type="number"
                min={0}
                max={24}
                step="1"
                inputMode="numeric"
                defaultValue={s.matutinoHasta}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`nocturna_desde_${s.sedeId}`}>
                Nocturna desde (hora)
              </Label>
              <Input
                id={`nocturna_desde_${s.sedeId}`}
                name={`nocturna_desde_${s.sedeId}`}
                type="number"
                min={0}
                max={24}
                step="1"
                inputMode="numeric"
                defaultValue={s.nocturnaDesde}
              />
            </div>
          </div>
        </div>
      ))}

      {state.error ? (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-logro" role="status">
          Tarifas guardadas.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
