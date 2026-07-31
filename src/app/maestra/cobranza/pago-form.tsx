"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CreditCard } from "lucide-react";
import {
  registrarPago,
  type CobranzaState,
} from "@/lib/data/cobranza-actions";
import type { AlumnaOpcion, CargoFila } from "@/types/domain";
import { formatMXN } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const initialState: CobranzaState = { error: null, ok: false };

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

function SubmitButton({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || total <= 0}>
      {pending ? "Registrando…" : `Registrar pago ${formatMXN(total)}`}
    </Button>
  );
}

export function RegistrarPagoDialog({
  alumnas,
  cargosAbiertos,
}: {
  alumnas: AlumnaOpcion[];
  cargosAbiertos: CargoFila[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(registrarPago, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [inscripcionId, setInscripcionId] = useState("");
  // Map cargoId -> { seleccionado, abono (string) }
  const [seleccion, setSeleccion] = useState<
    Record<string, { on: boolean; abono: string }>
  >({});

  const hoy = new Date().toISOString().slice(0, 10);

  const cargosDeAlumna = useMemo(
    () =>
      cargosAbiertos.filter(
        (c) => c.inscripcionId === inscripcionId && c.saldo > 0,
      ),
    [cargosAbiertos, inscripcionId],
  );

  const total = useMemo(() => {
    let t = 0;
    for (const c of cargosDeAlumna) {
      const sel = seleccion[c.id];
      if (!sel?.on) continue;
      const abono = sel.abono === "" ? c.saldo : Number(sel.abono);
      if (Number.isFinite(abono) && abono > 0) t += Math.min(abono, c.saldo);
    }
    return Math.round(t * 100) / 100;
  }, [cargosDeAlumna, seleccion]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setSeleccion({});
      setInscripcionId("");
      setAbierto(false);
    }
  }, [state.ok]);

  function toggle(cargoId: string, on: boolean) {
    setSeleccion((prev) => ({
      ...prev,
      [cargoId]: { on, abono: prev[cargoId]?.abono ?? "" },
    }));
  }
  function setAbono(cargoId: string, abono: string) {
    setSeleccion((prev) => ({
      ...prev,
      [cargoId]: { on: prev[cargoId]?.on ?? true, abono },
    }));
  }

  return (
    <>
      <Button size="sm" onClick={() => setAbierto(true)}>
        <CreditCard className="h-4 w-4" />
        Registrar pago
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              Aplica el pago a uno o más cargos de la alumna. Admite abonos
              parciales.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={formAction} className="space-y-4">
            <input type="hidden" name="inscripcion_id" value={inscripcionId} />

            <div className="space-y-2">
              <Label htmlFor="pago-alumna">Alumna</Label>
              <select
                id="pago-alumna"
                value={inscripcionId}
                onChange={(e) => {
                  setInscripcionId(e.target.value);
                  setSeleccion({});
                }}
                className={selectClass}
              >
                <option value="">Selecciona una alumna…</option>
                {alumnas.map((a) => (
                  <option key={a.inscripcionId} value={a.inscripcionId}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            {inscripcionId ? (
              cargosDeAlumna.length === 0 ? (
                <p className="text-sm text-filo">
                  Esta alumna no tiene cargos con saldo pendiente.
                </p>
              ) : (
                <div className="space-y-2 rounded-lg border border-filo/15 p-3">
                  {cargosDeAlumna.map((c) => {
                    const sel = seleccion[c.id];
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={sel?.on ?? false}
                          onChange={(e) => toggle(c.id, e.target.checked)}
                          className="h-4 w-4 accent-profundo"
                        />
                        {sel?.on ? (
                          <input type="hidden" name="cargo_ids" value={c.id} />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-tinta">{c.concepto}</p>
                          <p className="text-xs text-filo">
                            {c.periodo ?? "—"} · saldo {formatMXN(c.saldo)}
                          </p>
                        </div>
                        <div className="relative w-28">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-filo">
                            $
                          </span>
                          <Input
                            name={`aplic_${c.id}`}
                            type="number"
                            min={0}
                            max={c.saldo}
                            step="0.01"
                            inputMode="decimal"
                            disabled={!sel?.on}
                            value={sel?.abono ?? ""}
                            onChange={(e) => setAbono(c.id, e.target.value)}
                            placeholder={c.saldo.toFixed(2)}
                            className="h-9 pl-5 text-right"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pago-metodo">Método</Label>
                <select
                  id="pago-metodo"
                  name="metodo"
                  defaultValue="transferencia"
                  className={selectClass}
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pago-fecha">Fecha de pago</Label>
                <Input
                  id="pago-fecha"
                  name="pagado_at"
                  type="date"
                  defaultValue={hoy}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pago-referencia">Referencia (opcional)</Label>
              <Input
                id="pago-referencia"
                name="referencia"
                placeholder="Folio, transferencia, etc."
              />
            </div>

            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <SubmitButton total={total} />
              <Button
                type="button"
                variant="outline"
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
