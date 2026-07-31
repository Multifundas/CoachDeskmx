"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { AsistenciaDefault } from "@/lib/data/tenant-config";
import { guardarAsistenciaDefault } from "@/lib/data/ajustes-actions";

const OPCIONES: {
  valor: AsistenciaDefault;
  titulo: string;
  detalle: string;
}[] = [
  {
    valor: "sin_marcar",
    titulo: "Requerir confirmación",
    detalle:
      "Cada clase empieza sin marcar; tú confirmas la asistencia de cada alumna.",
  },
  {
    valor: "presente",
    titulo: "Todas presentes por defecto",
    detalle:
      "Se pre-marcan presentes; solo ajustas las excepciones y confirmas para generar los cargos.",
  },
];

function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-profundo px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

export function AsistenciaDefaultForm({
  modoActual,
}: {
  modoActual: AsistenciaDefault;
}) {
  const [estado, formAction] = useFormState(guardarAsistenciaDefault, {
    error: null as string | null,
    ok: false,
  });

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        {OPCIONES.map((op) => (
          <label
            key={op.valor}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-filo/20 p-3 hover:bg-hielo/50"
          >
            <input
              type="radio"
              name="modo"
              value={op.valor}
              defaultChecked={op.valor === modoActual}
              className="mt-1 h-4 w-4 accent-profundo"
            />
            <span className="space-y-0.5">
              <span className="block font-medium text-tinta">{op.titulo}</span>
              <span className="block text-sm text-filo">{op.detalle}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <GuardarButton />
        {estado.ok ? (
          <span className="text-sm text-logro">Preferencia guardada.</span>
        ) : null}
        {estado.error ? (
          <span className="text-sm text-alerta">{estado.error}</span>
        ) : null}
      </div>
    </form>
  );
}
