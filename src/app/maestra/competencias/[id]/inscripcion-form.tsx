"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import {
  inscribirAlumna,
  type CompetenciaState,
} from "@/lib/data/competencias-actions";
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

const initialState: CompetenciaState = { error: null, ok: false };

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

export interface AlumnaOpcion {
  inscripcionId: string;
  nombre: string;
  nivelActualId: string | null;
}

export interface NivelConTarifa {
  id: string;
  nombre: string;
  monto: number | null; // cuota configurada (null = sin tarifa)
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Inscribiendo…" : "Inscribir"}
    </Button>
  );
}

export function InscribirAlumna({
  competenciaId,
  alumnas,
  niveles,
}: {
  competenciaId: string;
  alumnas: AlumnaOpcion[];
  niveles: NivelConTarifa[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(inscribirAlumna, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [alumnaSel, setAlumnaSel] = useState("");
  const [nivelSel, setNivelSel] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAlumnaSel("");
      setNivelSel("");
      setAbierto(false);
    }
  }, [state.ok]);

  // Al elegir alumna, prellenar su nivel actual.
  function onAlumnaChange(id: string) {
    setAlumnaSel(id);
    const a = alumnas.find((x) => x.inscripcionId === id);
    setNivelSel(a?.nivelActualId ?? "");
  }

  const cuota = useMemo(() => {
    const n = niveles.find((x) => x.id === nivelSel);
    return n?.monto ?? null;
  }, [nivelSel, niveles]);

  const sinAlumnas = alumnas.length === 0;

  return (
    <>
      <Button size="sm" onClick={() => setAbierto(true)} disabled={sinAlumnas}>
        <UserPlus className="h-4 w-4" />
        Inscribir alumna
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscribir alumna</DialogTitle>
            <DialogDescription>
              Se genera el cargo de la cuota y se agenda su coacheo el día de la
              competencia.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={formAction} className="space-y-4">
            <input type="hidden" name="competencia_id" value={competenciaId} />

            <div className="space-y-2">
              <Label htmlFor="insc-alumna">Alumna</Label>
              <select
                id="insc-alumna"
                name="inscripcion_id"
                required
                className={selectClass}
                value={alumnaSel}
                onChange={(e) => onAlumnaChange(e.target.value)}
              >
                <option value="">Selecciona…</option>
                {alumnas.map((a) => (
                  <option key={a.inscripcionId} value={a.inscripcionId}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insc-nivel">Nivel</Label>
                <select
                  id="insc-nivel"
                  name="nivel_id"
                  className={selectClass}
                  value={nivelSel}
                  onChange={(e) => setNivelSel(e.target.value)}
                >
                  <option value="">Sin nivel</option>
                  {niveles.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="insc-categoria">Categoría</Label>
                <Input
                  id="insc-categoria"
                  name="categoria"
                  placeholder="Ej. Individual"
                />
              </div>
            </div>

            <div className="rounded-lg border border-filo/15 bg-hielo/40 p-3 text-sm">
              <p className="text-tinta">
                Cuota de coacheo:{" "}
                <span className="font-semibold text-profundo">
                  {cuota == null ? "sin tarifa (se cargará $0.00)" : formatMXN(cuota)}
                </span>
              </p>
              <p className="mt-1 text-xs text-filo">
                Se creará un cargo pendiente en el mes de la competencia y un
                evento de coacheo en la Agenda.
              </p>
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
