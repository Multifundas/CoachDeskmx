"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Copy, ExternalLink, Share2, Trophy } from "lucide-react";
import {
  crearTokenDesempeno,
  type TokenDesempState,
} from "@/lib/data/desempeno-actions";
import { Button } from "@/components/ui/button";

const initialState: TokenDesempState = { error: null, ok: false };

function GenerarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      <Trophy className="h-4 w-4" />
      {pending ? "Generando…" : "Compartir desempeño"}
    </Button>
  );
}

export function CompartirDesempeno({
  inscripcionId,
  alumna,
  appUrl,
}: {
  inscripcionId: string;
  alumna: string;
  appUrl: string;
}) {
  const [state, formAction] = useFormState(crearTokenDesempeno, initialState);
  const [copiado, setCopiado] = useState(false);

  const url = state.token ? `${appUrl}/d/${state.token}` : "";
  const waHref = url
    ? `https://wa.me/?text=${encodeURIComponent(
        `Desempeño de ${alumna}: ${url}`,
      )}`
    : "";

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // El navegador puede bloquear el portapapeles; el enlace sigue visible.
    }
  }

  return (
    <div className="space-y-3">
      {!state.token ? (
        <form action={formAction}>
          <input type="hidden" name="inscripcion_id" value={inscripcionId} />
          <GenerarButton />
          {state.error ? (
            <p className="mt-2 text-sm text-alerta" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="space-y-2 rounded-lg border border-filo/20 p-3">
          <p className="text-xs text-filo">
            Enlace de solo lectura con el camino al próximo nivel y las tareas.
            Cualquiera con este enlace podrá verlo.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex h-9 w-full rounded-md border border-filo/40 bg-white px-3 text-sm text-tinta"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copiar}
              title="Copiar enlace"
            >
              {copiado ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-filo/40 px-3 text-sm font-medium text-tinta transition-colors hover:bg-hielo/40"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir desempeño
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-logro px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Share2 className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
