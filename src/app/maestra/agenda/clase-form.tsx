"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import type {
  ConceptoFila,
  DiaSemana,
  SedeOpcion,
  TipoEvento,
} from "@/types/domain";
import { crearClase, type AgendaState } from "@/lib/data/agenda-actions";
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
import { TIPO_LABEL } from "./agenda-shared";

const initialState: AgendaState = { error: null, ok: false };

const TIPOS: TipoEvento[] = ["clase", "competencia", "examen", "evento", "otro"];

// Días de la semana con valor 0-6 (0=domingo). Se muestran Lun-Dom.
const DIAS: { valor: DiaSemana; label: string }[] = [
  { valor: 1, label: "L" },
  { valor: 2, label: "M" },
  { valor: 3, label: "Mi" },
  { valor: 4, label: "J" },
  { valor: 5, label: "V" },
  { valor: 6, label: "S" },
  { valor: 0, label: "D" },
];

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Agendar"}
    </Button>
  );
}

export function NuevaClase({
  sedes,
  conceptos,
  fechaInicial,
}: {
  sedes: SedeOpcion[];
  conceptos: ConceptoFila[];
  fechaInicial?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [recurrente, setRecurrente] = useState(false);
  const [state, formAction] = useFormState(crearClase, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setRecurrente(false);
      setAbierto(false);
    }
  }, [state.ok]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Button size="sm" onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" />
        Nueva clase
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva clase o evento</DialogTitle>
            <DialogDescription>
              Programa una clase única o una serie semanal.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clase-titulo">Título</Label>
              <Input
                id="clase-titulo"
                name="titulo"
                required
                minLength={2}
                placeholder="Ej. Clase grupal infantil"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clase-tipo">Tipo</Label>
                <select id="clase-tipo" name="tipo" defaultValue="clase" className={selectClass}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clase-sede">Pista</Label>
                <select id="clase-sede" name="sede_id" defaultValue="" className={selectClass}>
                  <option value="">Sin pista</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clase-concepto">Concepto (opcional)</Label>
              <select
                id="clase-concepto"
                name="concepto_id"
                defaultValue=""
                className={selectClass}
              >
                <option value="">Sin concepto</option>
                {conceptos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-filo">
                Solo como referencia. El cobro de la clase se calcula automáticamente.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="clase-fecha">Fecha</Label>
                <Input
                  id="clase-fecha"
                  name="fecha_inicio"
                  type="date"
                  required
                  defaultValue={fechaInicial ?? hoy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clase-hi">Inicio</Label>
                <Input id="clase-hi" name="hora_inicio" type="time" required defaultValue="16:00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clase-hf">Fin</Label>
                <Input id="clase-hf" name="hora_fin" type="time" required defaultValue="17:00" />
              </div>
            </div>

            <div className="rounded-lg border border-filo/15 p-3">
              <label className="flex items-center gap-2 text-sm text-tinta">
                <input
                  type="checkbox"
                  name="recurrente"
                  checked={recurrente}
                  onChange={(e) => setRecurrente(e.target.checked)}
                  className="h-4 w-4 accent-profundo"
                />
                Repetir cada semana
              </label>

              {recurrente ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-filo">Días</span>
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS.map((d) => (
                        <label
                          key={d.valor}
                          className="inline-flex cursor-pointer items-center"
                        >
                          <input
                            type="checkbox"
                            name="dias"
                            value={d.valor}
                            className="peer sr-only"
                          />
                          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-filo/30 text-sm text-tinta peer-checked:border-profundo peer-checked:bg-profundo peer-checked:text-white">
                            {d.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clase-ff">Repetir hasta</Label>
                    <Input id="clase-ff" name="fecha_fin" type="date" />
                  </div>
                </div>
              ) : null}
            </div>

            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <SubmitButton />
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
