"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  crearCompetencia,
  type CompetenciaState,
} from "@/lib/data/competencias-actions";
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

const initialState: CompetenciaState = { error: null, ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Crear competencia"}
    </Button>
  );
}

export function NuevaCompetencia() {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(crearCompetencia, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAbierto(false);
    }
  }, [state.ok]);

  return (
    <>
      <Button size="sm" onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" />
        Nueva competencia
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva competencia</DialogTitle>
            <DialogDescription>
              Se registra y aparece en la Agenda como evento de competencia.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comp-nombre">Nombre</Label>
              <Input
                id="comp-nombre"
                name="nombre"
                required
                minLength={2}
                placeholder="Ej. Copa Invierno 2027"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="comp-fecha">Fecha</Label>
                <Input id="comp-fecha" name="fecha" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-sede">Sede</Label>
                <Input
                  id="comp-sede"
                  name="sede"
                  placeholder="Pista / ciudad"
                />
              </div>
            </div>

            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <SubmitButton />
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
