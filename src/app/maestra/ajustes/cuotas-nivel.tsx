"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  guardarTarifasNivel,
  type CompetenciaState,
} from "@/lib/data/competencias-actions";
import type { TarifaNivel } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CompetenciaState = { error: null, ok: false };

const RAMA_LABEL: Record<string, string> = {
  infantil: "Infantil",
  adulto: "Adulto",
  parejas: "Parejas",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cuotas"}
    </Button>
  );
}

export function CuotasNivelForm({ tarifas }: { tarifas: TarifaNivel[] }) {
  const [state, formAction] = useFormState(guardarTarifasNivel, initialState);

  if (tarifas.length === 0) {
    return (
      <p className="text-sm text-filo">
        No hay niveles en la temporada activa. Configura la temporada primero.
      </p>
    );
  }

  // Agrupar por rama para lectura.
  const porRama = new Map<string, TarifaNivel[]>();
  for (const t of tarifas) {
    const arr = porRama.get(t.rama) ?? [];
    arr.push(t);
    porRama.set(t.rama, arr);
  }

  return (
    <form action={formAction} className="space-y-5">
      {[...porRama.entries()].map(([rama, filas]) => (
        <div key={rama} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-filo">
            {RAMA_LABEL[rama] ?? rama}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {filas.map((t) => (
              <div key={t.nivelId} className="space-y-1.5">
                <Label htmlFor={`monto_${t.nivelId}`}>{t.nivelNombre}</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-filo">
                    $
                  </span>
                  <Input
                    id={`monto_${t.nivelId}`}
                    name={`monto_${t.nivelId}`}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    defaultValue={t.monto ?? ""}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
            ))}
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
          Cuotas guardadas.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
