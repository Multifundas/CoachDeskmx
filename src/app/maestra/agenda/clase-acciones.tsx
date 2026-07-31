"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { CheckSquare, MoreVertical, Pencil, Ban, RotateCcw } from "lucide-react";
import type { OcurrenciaAgenda, TipoEvento } from "@/types/domain";
import {
  editarClase,
  cancelarClase,
  reactivarClase,
  type AgendaState,
} from "@/lib/data/agenda-actions";
import { fechaLocalISO, horaLocal } from "@/lib/agenda-tz";
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

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : children}
    </Button>
  );
}

function CancelSubmit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Cancelando…" : children}
    </Button>
  );
}

function ReactivarSubmit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Reactivando…" : children}
    </Button>
  );
}

export function ClaseAcciones({ ocurrencia }: { ocurrencia: OcurrenciaAgenda }) {
  const [menu, setMenu] = useState(false);
  const [editar, setEditar] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const [reactivar, setReactivar] = useState(false);

  const o = ocurrencia;
  const cancelada = o.estado === "cancelado";

  return (
    <div className="relative flex items-center gap-1">
      <Link
        href={`/maestra/agenda/${o.ocurrenciaId}`}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-filo/20 px-2 text-xs font-medium text-tinta hover:bg-hielo"
      >
        <CheckSquare className="h-3.5 w-3.5" />
        Asistencia
      </Link>

      <button
        type="button"
        onClick={() => setMenu((v) => !v)}
        onBlur={() => setTimeout(() => setMenu(false), 150)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-filo/20 text-tinta hover:bg-hielo"
        aria-label="Más acciones"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menu ? (
        <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-md border border-filo/20 bg-white shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setMenu(false);
              setEditar(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tinta hover:bg-hielo"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
          {!cancelada ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMenu(false);
                setCancelar(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-alerta hover:bg-hielo"
            >
              <Ban className="h-3.5 w-3.5" />
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMenu(false);
                setReactivar(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-logro hover:bg-hielo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reactivar
            </button>
          )}
        </div>
      ) : null}

      <EditarDialog
        ocurrencia={o}
        abierto={editar}
        onClose={() => setEditar(false)}
      />
      <CancelarDialog
        ocurrencia={o}
        abierto={cancelar}
        onClose={() => setCancelar(false)}
      />
      <ReactivarDialog
        ocurrencia={o}
        abierto={reactivar}
        onClose={() => setReactivar(false)}
      />
    </div>
  );
}

function EditarDialog({
  ocurrencia: o,
  abierto,
  onClose,
}: {
  ocurrencia: OcurrenciaAgenda;
  abierto: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(editarClase, initialState);
  const [alcance, setAlcance] = useState<"una" | "serie">("una");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  const fecha = fechaLocalISO(o.inicioUtc, o.timezoneSede);
  const hi = horaLocal(o.inicioUtc, o.timezoneSede);
  const hf = horaLocal(o.finUtc, o.timezoneSede);

  return (
    <Dialog open={abierto} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar clase</DialogTitle>
          <DialogDescription>{o.titulo}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="evento_id" value={o.eventoId} />
          <input type="hidden" name="ocurrencia_id" value={o.ocurrenciaId} />
          <input type="hidden" name="alcance" value={alcance} />

          {o.esSerie ? (
            <div className="flex gap-2 rounded-lg border border-filo/15 p-1">
              <button
                type="button"
                onClick={() => setAlcance("una")}
                className={
                  "flex-1 rounded-md px-3 py-1.5 text-sm " +
                  (alcance === "una"
                    ? "bg-profundo text-white"
                    : "text-tinta hover:bg-hielo")
                }
              >
                Solo esta
              </button>
              <button
                type="button"
                onClick={() => setAlcance("serie")}
                className={
                  "flex-1 rounded-md px-3 py-1.5 text-sm " +
                  (alcance === "serie"
                    ? "bg-profundo text-white"
                    : "text-tinta hover:bg-hielo")
                }
              >
                Toda la serie
              </button>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ed-titulo">Título</Label>
            <Input
              id="ed-titulo"
              name="titulo"
              required
              minLength={2}
              defaultValue={o.titulo}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ed-tipo">Tipo</Label>
            <select
              id="ed-tipo"
              name="tipo"
              defaultValue={o.tipo}
              className={selectClass}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          {alcance === "una" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ed-fecha">Fecha</Label>
                <Input id="ed-fecha" name="fecha" type="date" defaultValue={fecha} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-hi">Inicio</Label>
                <Input id="ed-hi" name="hora_inicio" type="time" defaultValue={hi} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-hf">Fin</Label>
                <Input id="ed-hf" name="hora_fin" type="time" defaultValue={hf} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-filo">
              Cambia el título y tipo de todas las clases de la serie. Para mover
              un horario específico, usa “Solo esta”.
            </p>
          )}

          {state.error ? (
            <p className="text-sm text-alerta" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <SubmitButton>Guardar</SubmitButton>
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelarDialog({
  ocurrencia: o,
  abierto,
  onClose,
}: {
  ocurrencia: OcurrenciaAgenda;
  abierto: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(cancelarClase, initialState);
  const [alcance, setAlcance] = useState<"una" | "serie">("una");

  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Dialog open={abierto} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar clase</DialogTitle>
          <DialogDescription>{o.titulo}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="evento_id" value={o.eventoId} />
          <input type="hidden" name="ocurrencia_id" value={o.ocurrenciaId} />
          <input type="hidden" name="alcance" value={alcance} />

          {o.esSerie ? (
            <div className="flex gap-2 rounded-lg border border-filo/15 p-1">
              <button
                type="button"
                onClick={() => setAlcance("una")}
                className={
                  "flex-1 rounded-md px-3 py-1.5 text-sm " +
                  (alcance === "una"
                    ? "bg-alerta text-white"
                    : "text-tinta hover:bg-hielo")
                }
              >
                Solo esta
              </button>
              <button
                type="button"
                onClick={() => setAlcance("serie")}
                className={
                  "flex-1 rounded-md px-3 py-1.5 text-sm " +
                  (alcance === "serie"
                    ? "bg-alerta text-white"
                    : "text-tinta hover:bg-hielo")
                }
              >
                Toda la serie
              </button>
            </div>
          ) : null}

          <p className="text-sm text-filo">
            {alcance === "serie"
              ? "Se cancelarán todas las clases de esta serie."
              : "Se cancelará únicamente esta clase."}{" "}
            La asistencia registrada se conserva.
          </p>

          {state.error ? (
            <p className="text-sm text-alerta" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <CancelSubmit>
              {alcance === "serie" ? "Cancelar serie" : "Cancelar clase"}
            </CancelSubmit>
            <Button type="button" variant="outline" onClick={onClose}>
              Volver
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReactivarDialog({
  ocurrencia: o,
  abierto,
  onClose,
}: {
  ocurrencia: OcurrenciaAgenda;
  abierto: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(reactivarClase, initialState);
  const [alcance, setAlcance] = useState<"una" | "serie">("una");

  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Dialog open={abierto} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivar clase</DialogTitle>
          <DialogDescription>{o.titulo}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="evento_id" value={o.eventoId} />
          <input type="hidden" name="ocurrencia_id" value={o.ocurrenciaId} />
          <input type="hidden" name="alcance" value={alcance} />

          {o.esSerie ? (
            <div className="flex gap-2 rounded-lg border border-filo/15 p-1">
              <button
                type="button"
                onClick={() => setAlcance("una")}
                className={
                  "flex-1 rounded-md px-3 py-1.5 text-sm " +
                  (alcance === "una"
                    ? "bg-profundo text-white"
                    : "text-tinta hover:bg-hielo")
                }
              >
                Solo esta
              </button>
              <button
                type="button"
                onClick={() => setAlcance("serie")}
                className={
                  "flex-1 rounded-md px-3 py-1.5 text-sm " +
                  (alcance === "serie"
                    ? "bg-profundo text-white"
                    : "text-tinta hover:bg-hielo")
                }
              >
                Toda la serie
              </button>
            </div>
          ) : null}

          <p className="text-sm text-filo">
            {alcance === "serie"
              ? "Se reactivarán todas las clases canceladas de esta serie."
              : "Esta clase volverá a estar activa en tu agenda y calendario."}
          </p>

          {state.error ? (
            <p className="text-sm text-alerta" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <ReactivarSubmit>
              {alcance === "serie" ? "Reactivar serie" : "Reactivar clase"}
            </ReactivarSubmit>
            <Button type="button" variant="outline" onClick={onClose}>
              Volver
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
