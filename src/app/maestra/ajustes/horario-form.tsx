"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import type { SedeAdmin } from "@/lib/data/sedes";
import type { BloqueFila } from "@/lib/data/bloques";
import {
  crearBloque,
  editarBloque,
  eliminarBloque,
  type AccionState,
} from "@/lib/data/bloques-actions";
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

const initialState: AccionState = { error: null, ok: false };

// 0=domingo … 6=sábado (coincide con el check de bloques_hielo).
export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : children}
    </Button>
  );
}

function Campos({
  sedes,
  bloque,
}: {
  sedes: SedeAdmin[];
  bloque?: BloqueFila;
}) {
  const prefix = bloque ? `edit-${bloque.id}` : "nuevo-bloque";
  const [modo, setModo] = useState<"recurrente" | "puntual">(
    bloque?.fecha ? "puntual" : "recurrente",
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-sede`}>Pista</Label>
        <select
          id={`${prefix}-sede`}
          name="sede_id"
          defaultValue={bloque?.sedeId ?? ""}
          required
          className={selectClass}
        >
          <option value="" disabled>
            Selecciona una pista
          </option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
              {!s.activa ? " (archivada)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Tipo de horario</Label>
        <div className="flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-filo/40 px-3 py-2 text-sm text-tinta has-[:checked]:border-profundo has-[:checked]:bg-profundo/5">
            <input
              type="radio"
              name="modo"
              value="recurrente"
              checked={modo === "recurrente"}
              onChange={() => setModo("recurrente")}
            />
            Cada semana
          </label>
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-filo/40 px-3 py-2 text-sm text-tinta has-[:checked]:border-profundo has-[:checked]:bg-profundo/5">
            <input
              type="radio"
              name="modo"
              value="puntual"
              checked={modo === "puntual"}
              onChange={() => setModo("puntual")}
            />
            Fecha específica
          </label>
        </div>
      </div>

      {modo === "recurrente" ? (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-dia`}>Día de la semana</Label>
          <select
            id={`${prefix}-dia`}
            name="dia_semana"
            defaultValue={String(bloque?.diaSemana ?? 1)}
            className={selectClass}
          >
            {DIAS_SEMANA.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-fecha`}>Fecha</Label>
          <Input
            id={`${prefix}-fecha`}
            name="fecha"
            type="date"
            defaultValue={bloque?.fecha ?? ""}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-inicio`}>Hora de inicio</Label>
          <Input
            id={`${prefix}-inicio`}
            name="hora_inicio"
            type="time"
            required
            defaultValue={bloque?.horaInicio ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-fin`}>Hora de fin</Label>
          <Input
            id={`${prefix}-fin`}
            name="hora_fin"
            type="time"
            required
            defaultValue={bloque?.horaFin ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-capacidad`}>Capacidad (opcional)</Label>
        <Input
          id={`${prefix}-capacidad`}
          name="capacidad"
          type="number"
          min={0}
          defaultValue={bloque?.capacidad != null ? String(bloque.capacidad) : ""}
          placeholder="Ej. 10"
        />
      </div>
    </div>
  );
}

// ---- Alta de horario --------------------------------------------------------
export function AgregarHorario({ sedes }: { sedes: SedeAdmin[] }) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(crearBloque, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAbierto(false);
    }
  }, [state.ok]);

  const sinSedes = sedes.length === 0;

  return (
    <>
      <Button size="sm" onClick={() => setAbierto(true)} disabled={sinSedes}>
        <Plus className="h-4 w-4" />
        Agregar horario
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo horario</DialogTitle>
            <DialogDescription>
              Define un bloque de hielo recurrente o para una fecha específica.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={formAction} className="space-y-4">
            <Campos sedes={sedes} />
            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <SubmitButton>Guardar horario</SubmitButton>
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

// ---- Edición de horario -----------------------------------------------------
export function EditarHorario({
  bloque,
  sedes,
}: {
  bloque: BloqueFila;
  sedes: SedeAdmin[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [state, formAction] = useFormState(editarBloque, initialState);
  const [eliminarState, eliminarAction] = useFormState(
    eliminarBloque,
    initialState,
  );

  useEffect(() => {
    if (state.ok || eliminarState.ok) {
      setAbierto(false);
      setConfirmarBorrado(false);
    }
  }, [state.ok, eliminarState.ok]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        Editar
      </Button>

      <Dialog
        open={abierto}
        onOpenChange={(v) => {
          setAbierto(v);
          if (!v) setConfirmarBorrado(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar horario</DialogTitle>
            <DialogDescription>
              Actualiza el bloque de hielo.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={bloque.id} />
            <Campos sedes={sedes} bloque={bloque} />
            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <SubmitButton>Guardar cambios</SubmitButton>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>

          <div className="space-y-3 border-t border-filo/15 pt-3">
            {confirmarBorrado ? (
              <form action={eliminarAction} className="space-y-2">
                <input type="hidden" name="id" value={bloque.id} />
                <input type="hidden" name="confirmar" value="true" />
                <p className="text-sm text-tinta">
                  ¿Eliminar este horario de forma permanente? Esta acción no se
                  puede deshacer.
                </p>
                {eliminarState.error ? (
                  <p className="text-sm text-alerta" role="alert">
                    {eliminarState.error}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <EliminarButton />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmarBorrado(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmarBorrado(true)}
                className="text-sm text-alerta hover:underline"
              >
                Eliminar horario permanentemente
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EliminarButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={pending}
      className="border-alerta/40 text-alerta hover:bg-alerta/10"
    >
      {pending ? "Eliminando…" : "Sí, eliminar"}
    </Button>
  );
}
