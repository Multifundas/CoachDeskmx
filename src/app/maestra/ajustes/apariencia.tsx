"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { TEMAS, type TemaId } from "@/lib/temas";
import { guardarTema } from "@/lib/data/ajustes-actions";
import { cn } from "@/lib/utils";

// Aplica el tema al contenedor del AppShell (el <div data-theme> más cercano) o,
// como respaldo, al <html>. Da vista previa inmediata sin esperar al servidor.
function aplicarTemaEnDOM(tema: TemaId) {
  if (typeof document === "undefined") return;
  const contenedor = document.querySelector<HTMLElement>("[data-theme]");
  (contenedor ?? document.documentElement).setAttribute("data-theme", tema);
}

export function SelectorApariencia({ temaActual }: { temaActual: TemaId }) {
  const [seleccion, setSeleccion] = useState<TemaId>(temaActual);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Si el servidor cambia el tema (revalidate), reflejarlo.
  useEffect(() => {
    setSeleccion(temaActual);
  }, [temaActual]);

  function elegir(tema: TemaId) {
    if (tema === seleccion) return;
    setSeleccion(tema);
    setError(null);
    aplicarTemaEnDOM(tema); // preview inmediato

    const formData = new FormData();
    formData.set("tema", tema);
    startTransition(async () => {
      const res = await guardarTema({ error: null, ok: false }, formData);
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar el tema.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMAS.map((t) => {
          const activo = t.id === seleccion;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => elegir(t.id)}
              disabled={pending}
              aria-pressed={activo}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2 disabled:opacity-60",
                activo
                  ? "border-profundo ring-1 ring-profundo"
                  : "border-filo/20 hover:border-profundo/50",
              )}
            >
              {/* Muestra de la paleta */}
              <span className="flex shrink-0 overflow-hidden rounded-lg border border-filo/15">
                {t.muestra.map((hex, i) => (
                  <span
                    key={i}
                    className="h-10 w-4"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-medium text-tinta">
                  {t.nombre}
                  {activo ? (
                    <Check className="h-4 w-4 text-profundo" aria-hidden />
                  ) : null}
                </span>
                <span className="block text-xs text-filo">{t.descripcion}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm text-alerta" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
