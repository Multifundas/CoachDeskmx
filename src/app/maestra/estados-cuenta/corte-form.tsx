"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { FileText, Plus } from "lucide-react";
import {
  generarEstadoCuenta,
  agregarConceptoExtra,
  type EdcState,
} from "@/lib/data/estados-cuenta-actions";
import type { AlumnaOpcion, ConceptoFila } from "@/types/domain";
import { formatMXN } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: EdcState = { error: null, ok: false };

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

function GenerarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <FileText className="h-4 w-4" />
      {pending ? "Generando…" : "Generar estado de cuenta"}
    </Button>
  );
}

function AgregarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? "Agregando…" : "Agregar concepto"}
    </Button>
  );
}

export function CorteForm({
  alumnas,
  conceptos,
}: {
  alumnas: AlumnaOpcion[];
  conceptos: ConceptoFila[];
}) {
  const [inscripcionId, setInscripcionId] = useState("");
  const [periodo, setPeriodo] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [genState, genAction] = useFormState(
    generarEstadoCuenta,
    initialState,
  );
  const [extraState, extraAction] = useFormState(
    agregarConceptoExtra,
    initialState,
  );

  const listos = Boolean(inscripcionId && periodo);
  // Conceptos con precio para el sub-form de extra (excluye modificadores).
  const conceptosExtra = conceptos.filter((c) => !c.esModificador);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="corte-alumna">Alumna</Label>
          <select
            id="corte-alumna"
            value={inscripcionId}
            onChange={(e) => setInscripcionId(e.target.value)}
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
        <div className="space-y-1.5">
          <Label htmlFor="corte-periodo">Periodo</Label>
          <input
            id="corte-periodo"
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={selectClass}
          />
        </div>
      </div>

      {listos ? (
        <>
          {/* Agregar concepto extra */}
          <form
            action={extraAction}
            className="space-y-3 rounded-lg border border-filo/15 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-filo">
              Agregar concepto extra
            </p>
            <input type="hidden" name="inscripcion_id" value={inscripcionId} />
            <input type="hidden" name="periodo" value={periodo} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="extra-concepto">Concepto</Label>
                <select
                  id="extra-concepto"
                  name="concepto_id"
                  className={selectClass}
                >
                  <option value="">Sin concepto (manual)</option>
                  {conceptosExtra.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.precioVigente != null
                        ? ` (${formatMXN(c.precioVigente)})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra-monto">Monto</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-filo">
                    $
                  </span>
                  <Input
                    id="extra-monto"
                    name="monto"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-7"
                    required
                  />
                </div>
              </div>
            </div>
            {extraState.error ? (
              <p className="text-sm text-alerta" role="alert">
                {extraState.error}
              </p>
            ) : null}
            {extraState.ok ? (
              <p className="text-sm text-logro" role="status">
                Concepto agregado al periodo.
              </p>
            ) : null}
            <AgregarButton />
          </form>

          {/* Generar el corte */}
          <form action={genAction} className="space-y-3">
            <input type="hidden" name="inscripcion_id" value={inscripcionId} />
            <input type="hidden" name="periodo" value={periodo} />
            <p className="text-sm text-filo">
              Se congelarán los cargos abiertos (pendiente/parcial) del periodo
              en un estado de cuenta con folio. Esta acción es definitiva.
            </p>
            {genState.error ? (
              <p className="text-sm text-alerta" role="alert">
                {genState.error}
              </p>
            ) : null}
            {genState.ok ? (
              <p className="text-sm text-logro" role="status">
                Estado de cuenta generado.
              </p>
            ) : null}
            <GenerarButton />
          </form>
        </>
      ) : (
        <p className="text-sm text-filo">
          Elige una alumna y un periodo para previsualizar y generar el corte.
        </p>
      )}
    </div>
  );
}
