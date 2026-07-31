"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Copy, Check, RefreshCw, Link2Off } from "lucide-react";
import type { FeedICS } from "@/lib/data/calendario";
import {
  generarTokenFeedICS,
  revocarTokenFeedICS,
} from "@/lib/data/ajustes-actions";

function GenerarButton({ regenerar }: { regenerar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md bg-profundo px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      <RefreshCw className="h-4 w-4" />
      {pending
        ? "Generando…"
        : regenerar
          ? "Regenerar enlace"
          : "Generar enlace"}
    </button>
  );
}

function RevocarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-alerta/40 px-4 py-2 text-sm font-medium text-alerta transition-colors hover:bg-alerta/10 disabled:opacity-50"
    >
      <Link2Off className="h-4 w-4" />
      {pending ? "Revocando…" : "Revocar"}
    </button>
  );
}

export function CalendarioFeedForm({ feed }: { feed: FeedICS | null }) {
  const [genEstado, genAction] = useFormState(generarTokenFeedICS, {
    error: null as string | null,
    ok: false,
  });
  const [revEstado, revAction] = useFormState(revocarTokenFeedICS, {
    error: null as string | null,
    ok: false,
  });
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!feed) return;
    try {
      await navigator.clipboard.writeText(feed.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Silencioso: el usuario puede copiar manualmente del campo.
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-filo">
        Suscríbete desde Google o Apple Calendar para ver tus clases y eventos.
        Es un enlace de solo lectura: los cambios que hagas en CoachDesk se
        reflejan en tu calendario (la sincronización puede tardar unas horas
        según el proveedor).
      </p>

      {feed ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={feed.url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-filo/40 bg-hielo/40 px-3 py-2 text-sm text-tinta"
              aria-label="URL de suscripción del calendario"
            />
            <button
              type="button"
              onClick={copiar}
              className="inline-flex items-center gap-1.5 rounded-md border border-filo/30 px-3 py-2 text-sm text-tinta transition-colors hover:bg-hielo"
            >
              {copiado ? (
                <>
                  <Check className="h-4 w-4 text-logro" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </button>
          </div>

          <details className="rounded-lg border border-filo/15 p-3 text-sm text-tinta">
            <summary className="cursor-pointer font-medium">
              Cómo suscribirte
            </summary>
            <div className="mt-2 space-y-2 text-filo">
              <p>
                <span className="font-medium text-tinta">Google Calendar:</span>{" "}
                Otros calendarios → Suscribirse a un calendario → pega la URL.
              </p>
              <p>
                <span className="font-medium text-tinta">Apple Calendar:</span>{" "}
                Archivo → Nueva suscripción de calendario → pega la URL.
              </p>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            <form action={genAction}>
              <GenerarButton regenerar />
            </form>
            <form action={revAction}>
              <RevocarButton />
            </form>
            <span className="text-xs text-filo">
              Regenerar invalida el enlace anterior.
            </span>
          </div>
        </div>
      ) : (
        <form action={genAction}>
          <GenerarButton regenerar={false} />
        </form>
      )}

      {genEstado.error ? (
        <p className="text-sm text-alerta">{genEstado.error}</p>
      ) : null}
      {revEstado.error ? (
        <p className="text-sm text-alerta">{revEstado.error}</p>
      ) : null}
    </div>
  );
}
