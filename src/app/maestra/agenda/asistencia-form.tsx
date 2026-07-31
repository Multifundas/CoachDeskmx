"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCheck } from "lucide-react";
import type { EstadoAsistencia } from "@/types/domain";
import type { AsistenciaFila } from "@/lib/data/agenda";
import type { AsistenciaDefault } from "@/lib/data/tenant-config";
import {
  marcarAsistencia,
  marcarTodasPresentes,
} from "@/lib/data/agenda-actions";

// Opciones de asistencia con su etiqueta y color de acento.
const OPCIONES: {
  valor: EstadoAsistencia;
  label: string;
  activo: string;
}[] = [
  { valor: "presente", label: "Presente", activo: "bg-logro text-white" },
  { valor: "ausente", label: "Ausente", activo: "bg-alerta text-white" },
  {
    valor: "justificada",
    label: "Justificada",
    activo: "bg-profundo text-white",
  },
];

function FilaAsistencia({
  ocurrenciaId,
  fila,
  preseleccion,
}: {
  ocurrenciaId: string;
  fila: AsistenciaFila;
  // Estado a mostrar cuando la fila está 'sin_marcar' pero el tenant usa
  // asistencia por defecto 'presente'. La preselección NO se persiste hasta que
  // la maestra la confirma (clic individual o botón "Marcar todas presentes").
  preseleccion: boolean;
}) {
  const inicial: EstadoAsistencia =
    fila.estado === "sin_marcar" && preseleccion ? "presente" : fila.estado;
  const [estado, setEstado] = useState<EstadoAsistencia>(inicial);
  // Una preselección no persistida: se ve presente pero sin registro en BD.
  const [tentativo, setTentativo] = useState(
    fila.estado === "sin_marcar" && preseleccion,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function marcar(nuevo: EstadoAsistencia) {
    // Alternar: si ya está en ese estado (y ya persistido), vuelve a sin_marcar.
    const destino: EstadoAsistencia =
      estado === nuevo && !tentativo ? "sin_marcar" : nuevo;
    const anterior = estado;
    const eraTentativo = tentativo;
    setEstado(destino);
    setTentativo(false);
    setError(null);

    const fd = new FormData();
    fd.set("ocurrencia_id", ocurrenciaId);
    fd.set("inscripcion_id", fila.inscripcionId);
    fd.set("estado", destino);

    startTransition(async () => {
      const res = await marcarAsistencia({ error: null, ok: false }, fd);
      if (!res.ok) {
        setEstado(anterior);
        setTentativo(eraTentativo);
        setError(res.error ?? "No se pudo guardar.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-tinta">
          {fila.nombre}
          {tentativo ? (
            <span className="ml-2 text-xs font-normal text-filo">
              (por defecto)
            </span>
          ) : null}
        </p>
        {error ? <p className="text-xs text-alerta">{error}</p> : null}
      </div>
      <div className="flex gap-1.5">
        {OPCIONES.map((op) => {
          const activo = estado === op.valor;
          return (
            <button
              key={op.valor}
              type="button"
              disabled={pending}
              onClick={() => marcar(op.valor)}
              className={
                "rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 " +
                (activo
                  ? tentativo
                    ? "border-logro/50 bg-logro/15 text-logro"
                    : op.activo + " border-transparent"
                  : "border-filo/30 text-tinta hover:bg-hielo")
              }
            >
              {op.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MarcarTodasButton({ hay }: { hay: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !hay}
      className="inline-flex items-center gap-1.5 rounded-md bg-logro px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      <CheckCheck className="h-4 w-4" />
      {pending ? "Marcando…" : "Marcar todas presentes"}
    </button>
  );
}

export function AsistenciaForm({
  ocurrenciaId,
  asistencias,
  modoDefault,
}: {
  ocurrenciaId: string;
  asistencias: AsistenciaFila[];
  modoDefault: AsistenciaDefault;
}) {
  const [estado, formAction] = useFormState(marcarTodasPresentes, {
    error: null as string | null,
    ok: false,
  });

  if (asistencias.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-filo">
        No hay alumnas activas para tomar asistencia.
      </p>
    );
  }

  const preseleccion = modoDefault === "presente";
  const sinMarcar = asistencias.filter((a) => a.estado === "sin_marcar");

  return (
    <div className="space-y-3">
      {preseleccion ? (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="ocurrencia_id" value={ocurrenciaId} />
          {sinMarcar.map((a) => (
            <input
              key={a.inscripcionId}
              type="hidden"
              name="inscripcion_id"
              value={a.inscripcionId}
            />
          ))}
          <MarcarTodasButton hay={sinMarcar.length > 0} />
          <span className="text-xs text-filo">
            Todas se pre-marcan presentes. Confirma para generar los cargos o
            ajusta las excepciones abajo.
          </span>
          {estado.error ? (
            <p className="text-xs text-alerta">{estado.error}</p>
          ) : null}
        </form>
      ) : null}

      <div className="divide-y divide-filo/10 rounded-lg border border-filo/15">
        {asistencias.map((a) => (
          <FilaAsistencia
            key={a.inscripcionId}
            ocurrenciaId={ocurrenciaId}
            fila={a}
            preseleccion={preseleccion}
          />
        ))}
      </div>
    </div>
  );
}
