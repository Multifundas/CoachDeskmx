"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import type { SedeAdmin } from "@/lib/data/sedes";
import {
  crearSede,
  editarSede,
  archivarSede,
  eliminarSede,
  type AccionState,
} from "@/lib/data/ajustes-actions";
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

// Zonas horarias comunes en México (duplicado ligero del server para el cliente).
const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Mexico_City", label: "Centro (CDMX)" },
  { value: "America/Cancun", label: "Sureste (Cancún)" },
  { value: "America/Monterrey", label: "Monterrey" },
  { value: "America/Chihuahua", label: "Chihuahua" },
  { value: "America/Mazatlan", label: "Pacífico (Mazatlán)" },
  { value: "America/Hermosillo", label: "Sonora (Hermosillo)" },
  { value: "America/Tijuana", label: "Noroeste (Tijuana)" },
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

function Campos({ sede }: { sede?: SedeAdmin }) {
  const prefix = sede ? `edit-${sede.id}` : "nueva-sede";
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-nombre`}>Nombre de la pista</Label>
        <Input
          id={`${prefix}-nombre`}
          name="nombre"
          required
          minLength={2}
          defaultValue={sede?.nombre ?? ""}
          placeholder="Ej. Pista Central"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-timezone`}>Zona horaria</Label>
        <select
          id={`${prefix}-timezone`}
          name="timezone"
          defaultValue={sede?.timezone ?? "America/Mexico_City"}
          className={selectClass}
        >
          {TIMEZONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-direccion`}>Dirección (opcional)</Label>
        <Input
          id={`${prefix}-direccion`}
          name="direccion"
          defaultValue={sede?.direccion ?? ""}
        />
      </div>
    </div>
  );
}

// ---- Alta de sede -----------------------------------------------------------
export function AgregarSede() {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(crearSede, initialState);
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
        Agregar pista
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva pista</DialogTitle>
            <DialogDescription>
              Registra una sede donde impartes clases.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={formAction} className="space-y-4">
            <Campos />
            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <SubmitButton>Guardar pista</SubmitButton>
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

// ---- Edición de sede --------------------------------------------------------
export function EditarSede({ sede }: { sede: SedeAdmin }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [state, formAction] = useFormState(editarSede, initialState);
  const [archivarState, archivarAction] = useFormState(
    archivarSede,
    initialState,
  );
  const [eliminarState, eliminarAction] = useFormState(
    eliminarSede,
    initialState,
  );

  useEffect(() => {
    if (state.ok || archivarState.ok || eliminarState.ok) {
      setAbierto(false);
      setConfirmarBorrado(false);
    }
  }, [state.ok, archivarState.ok, eliminarState.ok]);

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
            <DialogTitle>Editar {sede.nombre}</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la pista.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={sede.id} />
            <input type="hidden" name="activa" value={String(sede.activa)} />
            <Campos sede={sede} />
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
            {sede.activa ? (
              <form action={archivarAction}>
                <input type="hidden" name="id" value={sede.id} />
                <button
                  type="submit"
                  className="text-sm text-filo hover:underline"
                >
                  Archivar pista (ocultar sin borrar)
                </button>
              </form>
            ) : null}

            {confirmarBorrado ? (
              <form action={eliminarAction} className="space-y-2">
                <input type="hidden" name="id" value={sede.id} />
                <input type="hidden" name="confirmar" value="true" />
                <p className="text-sm text-tinta">
                  ¿Eliminar <strong>{sede.nombre}</strong> de forma permanente?
                  Se borrarán sus tarifas y configuración. Los eventos pasados
                  conservan su historial pero pierden el vínculo con la pista.
                  Esta acción no se puede deshacer.
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
                Eliminar pista permanentemente
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
