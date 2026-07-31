"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Sprout, Plus } from "lucide-react";
import {
  guardarPreciosConceptos,
  sembrarConceptosBase,
  crearConcepto,
  editarConcepto,
  eliminarConcepto,
  type ConceptosState,
} from "@/lib/data/conceptos-actions";
import type { ConceptoFila } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const initialState: ConceptosState = { error: null, ok: false };

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

const TIPOS: { value: string; label: string }[] = [
  { value: "clase", label: "Clase" },
  { value: "inscripcion", label: "Inscripción" },
  { value: "competencia", label: "Competencia" },
  { value: "examen", label: "Examen" },
  { value: "material", label: "Material" },
  { value: "otro", label: "Otro" },
];

function TIPO_LABEL(tipo: string): string {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar precios"}
    </Button>
  );
}

function SembrarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      <Sprout className="h-4 w-4" />
      {pending ? "Sembrando…" : "Sembrar catálogo"}
    </Button>
  );
}

function GuardarButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : children}
    </Button>
  );
}

// ---- Alta de concepto -------------------------------------------------------
function AgregarConcepto() {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(crearConcepto, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAbierto(false);
    }
  }, [state.ok]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" />
        Agregar concepto
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo concepto</DialogTitle>
            <DialogDescription>
              Crea un concepto para cargos y pagos. La clave se genera del nombre.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nuevo-concepto-nombre">Nombre</Label>
              <Input
                id="nuevo-concepto-nombre"
                name="nombre"
                required
                minLength={2}
                placeholder="Ej. Renta de patines"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-concepto-tipo">Tipo</Label>
              <select
                id="nuevo-concepto-tipo"
                name="tipo"
                defaultValue="otro"
                className={selectClass}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-concepto-precio">Precio (opcional)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-filo">
                  $
                </span>
                <Input
                  id="nuevo-concepto-precio"
                  name="precio"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <GuardarButton>Crear concepto</GuardarButton>
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
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- Editar / eliminar concepto ---------------------------------------------
function EliminarConceptoButton() {
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

function EditarConcepto({ concepto }: { concepto: ConceptoFila }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [state, formAction] = useFormState(editarConcepto, initialState);
  const [eliminarState, eliminarAction] = useFormState(
    eliminarConcepto,
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
      <Button variant="ghost" size="sm" onClick={() => setAbierto(true)}>
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
            <DialogTitle>Editar {concepto.nombre}</DialogTitle>
            <DialogDescription>
              Actualiza el nombre, tipo o disponibilidad del concepto.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={concepto.id} />
            <div className="space-y-2">
              <Label htmlFor={`edit-concepto-nombre-${concepto.id}`}>
                Nombre
              </Label>
              <Input
                id={`edit-concepto-nombre-${concepto.id}`}
                name="nombre"
                required
                minLength={2}
                defaultValue={concepto.nombre}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-concepto-tipo-${concepto.id}`}>Tipo</Label>
              <select
                id={`edit-concepto-tipo-${concepto.id}`}
                name="tipo"
                defaultValue={concepto.tipo}
                className={selectClass}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-tinta">
              <input
                type="checkbox"
                name="activo"
                value="true"
                defaultChecked={concepto.activo}
                className="h-4 w-4 rounded border-filo/40"
              />
              Activo (disponible para nuevos cargos)
            </label>
            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <GuardarButton>Guardar cambios</GuardarButton>
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

          <div className="border-t border-filo/15 pt-3">
            {confirmarBorrado ? (
              <form action={eliminarAction} className="space-y-2">
                <input type="hidden" name="id" value={concepto.id} />
                <input type="hidden" name="confirmar" value="true" />
                <p className="text-sm text-tinta">
                  ¿Eliminar <strong>{concepto.nombre}</strong> de forma
                  permanente? Los cargos que lo usan conservan su historial. Esta
                  acción no se puede deshacer.
                </p>
                {eliminarState.error ? (
                  <p className="text-sm text-alerta" role="alert">
                    {eliminarState.error}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <EliminarConceptoButton />
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
                Eliminar concepto
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConceptosForm({ conceptos }: { conceptos: ConceptoFila[] }) {
  const [state, formAction] = useFormState(
    guardarPreciosConceptos,
    initialState,
  );
  const [sembrarState, sembrarAction] = useFormState(
    sembrarConceptosBase,
    initialState,
  );

  if (conceptos.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-filo">
          Aún no hay conceptos. Siembra el catálogo base o agrega el tuyo.
        </p>
        <div className="flex flex-wrap gap-2">
          <form action={sembrarAction}>
            <SembrarButton />
          </form>
          <AgregarConcepto />
        </div>
        {sembrarState.error ? (
          <p className="text-sm text-alerta" role="alert">
            {sembrarState.error}
          </p>
        ) : null}
      </div>
    );
  }

  // Los modificadores (mod_*) no tienen precio en conceptos_precios; su valor %
  // vive en la configuración de cada sede (ver "Precios por sede").
  const conPrecio = conceptos.filter((c) => !c.esModificador);
  const modificadores = conceptos.filter((c) => c.esModificador);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AgregarConcepto />
      </div>

      {/* Catálogo con acciones por fila */}
      <ul className="divide-y divide-filo/10">
        {conPrecio.map((c) => {
          const sistema = c.clave.startsWith("costo_hora_");
          return (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-tinta">
                  {c.nombre}
                  {sistema ? <Badge variant="outline">Sistema</Badge> : null}
                  {!c.activo ? (
                    <Badge variant="secondary">Inactivo</Badge>
                  ) : null}
                </p>
                <p className="text-xs text-filo">{TIPO_LABEL(c.tipo)}</p>
              </div>
              {sistema ? null : <EditarConcepto concepto={c} />}
            </li>
          );
        })}
      </ul>

      {/* Precios */}
      <form action={formAction} className="space-y-4 border-t border-filo/15 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-filo">
          Precios vigentes (MXN)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {conPrecio.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <Label htmlFor={`precio_${c.id}`}>{c.nombre}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-filo">
                  $
                </span>
                <Input
                  id={`precio_${c.id}`}
                  name={`precio_${c.id}`}
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  defaultValue={c.precioVigente ?? ""}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
          ))}
        </div>

        {state.error ? (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-logro" role="status">
            Precios guardados.
          </p>
        ) : null}

        <SubmitButton />
      </form>

      {modificadores.length > 0 ? (
        <div className="space-y-2 border-t border-filo/15 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-filo">
            Modificadores por horario
          </p>
          <p className="text-xs text-filo">
            Los porcentajes matutino/nocturno se configuran por sede en “Precios
            por sede”.
          </p>
          <ul className="text-sm text-tinta">
            {modificadores.map((c) => (
              <li key={c.id} className="py-0.5">
                {c.nombre}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form action={sembrarAction} className="border-t border-filo/15 pt-4">
        <SembrarButton />
        {sembrarState.error ? (
          <p className="mt-2 text-sm text-alerta" role="alert">
            {sembrarState.error}
          </p>
        ) : null}
        {sembrarState.ok ? (
          <p className="mt-2 text-sm text-logro" role="status">
            Catálogo actualizado.
          </p>
        ) : null}
      </form>
    </div>
  );
}
