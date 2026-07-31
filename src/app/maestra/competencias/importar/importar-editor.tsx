"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import {
  importarCompetencias,
  type ImportState,
} from "@/lib/data/competencias-actions";
import type { FilaCalendario } from "@/lib/data/calendario-femepashidi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const initialState: ImportState = { error: null, ok: false };

const TIPO_LABEL: Record<FilaCalendario["tipo"], string> = {
  copa: "Copa",
  examen: "Examen",
  isu: "ISU",
  qualifying: "Qualifying",
};

const TIPO_VARIANT: Record<
  FilaCalendario["tipo"],
  "default" | "secondary" | "success" | "outline"
> = {
  copa: "default",
  examen: "secondary",
  isu: "outline",
  qualifying: "success",
};

interface FilaEditable extends FilaCalendario {
  incluir: boolean;
}

function SubmitButton({ seleccionadas }: { seleccionadas: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || seleccionadas === 0}>
      <Upload className="h-4 w-4" />
      {pending
        ? "Importando…"
        : `Importar ${seleccionadas} competencia${seleccionadas === 1 ? "" : "s"}`}
    </Button>
  );
}

export function ImportarEditor({ filas }: { filas: FilaCalendario[] }) {
  const [state, formAction] = useFormState(importarCompetencias, initialState);
  const [rows, setRows] = useState<FilaEditable[]>(() =>
    filas.map((f) => ({ ...f, incluir: f.tipo === "copa" })),
  );

  const seleccionadas = useMemo(
    () => rows.filter((r) => r.incluir).length,
    [rows],
  );
  const todasMarcadas = seleccionadas === rows.length && rows.length > 0;

  function actualizar(i: number, cambios: Partial<FilaEditable>) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...cambios } : r)),
    );
  }

  function marcarTodas(valor: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, incluir: valor })));
  }

  if (state.ok) {
    return (
      <div className="rounded-lg border border-logro/30 bg-logro/5 p-6 text-center">
        <p className="font-medium text-tinta">
          Se importaron {state.creadas} competencias.
        </p>
        {state.error ? (
          <p className="mt-1 text-sm text-alerta">{state.error}</p>
        ) : null}
        <p className="mt-2 text-sm text-filo">
          Ya aparecen en la lista y en la Agenda como eventos de competencia.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="total" value={rows.length} />

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-tinta">
          <input
            type="checkbox"
            checked={todasMarcadas}
            onChange={(e) => marcarTodas(e.target.checked)}
            className="h-4 w-4 accent-profundo"
          />
          Marcar todas
        </label>
        <span className="text-sm text-filo">
          {seleccionadas} de {rows.length} seleccionadas
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-filo/15">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-filo/15 text-left text-xs text-filo">
              <th className="w-10 px-3 py-2"></th>
              <th className="px-3 py-2">Nombre</th>
              <th className="w-40 px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Sede</th>
              <th className="w-24 px-3 py-2">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={
                  r.incluir
                    ? "border-b border-filo/10"
                    : "border-b border-filo/10 opacity-50"
                }
              >
                <td className="px-3 py-2 align-middle">
                  <input
                    type="checkbox"
                    name={`incluir_${i}`}
                    checked={r.incluir}
                    onChange={(e) => actualizar(i, { incluir: e.target.checked })}
                    className="h-4 w-4 accent-profundo"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    name={`nombre_${i}`}
                    value={r.nombre}
                    onChange={(e) => actualizar(i, { nombre: e.target.value })}
                    disabled={!r.incluir}
                    className="h-9"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    name={`fecha_${i}`}
                    type="date"
                    value={r.fecha}
                    onChange={(e) => actualizar(i, { fecha: e.target.value })}
                    disabled={!r.incluir}
                    className="h-9"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    name={`sede_${i}`}
                    value={r.sede ?? ""}
                    onChange={(e) => actualizar(i, { sede: e.target.value })}
                    disabled={!r.incluir}
                    placeholder="Por confirmar"
                    className="h-9"
                  />
                </td>
                <td className="px-3 py-2">
                  <Badge variant={TIPO_VARIANT[r.tipo]}>
                    {TIPO_LABEL[r.tipo]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.error ? (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton seleccionadas={seleccionadas} />
    </form>
  );
}
