"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { SedeOpcion, TipoEvento } from "@/types/domain";
import type { AlumnaOpcion } from "@/lib/data/agenda";
import type { VistaAgenda } from "@/lib/agenda-rango";
import { Button } from "@/components/ui/button";
import { TIPO_LABEL } from "./agenda-shared";

const selectClass =
  "h-9 rounded-md border border-filo/40 bg-white px-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

const VISTAS: { id: VistaAgenda; label: string }[] = [
  { id: "lista", label: "Lista" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];

const TIPOS = Object.entries(TIPO_LABEL) as [TipoEvento, string][];

export function AgendaToolbar({
  vista,
  etiqueta,
  prevISO,
  nextISO,
  sedeId,
  inscripcionId,
  tipo,
  q,
  sedes,
  alumnas,
}: {
  vista: VistaAgenda;
  etiqueta: string;
  prevISO: string;
  nextISO: string;
  sedeId: string;
  inscripcionId: string;
  tipo: string;
  q: string;
  sedes: SedeOpcion[];
  alumnas: AlumnaOpcion[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [busqueda, setBusqueda] = useState(q);
  const primerRender = useRef(true);

  function navegar(cambios: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    router.push(`/maestra/agenda?${p.toString()}`);
  }

  // Sincroniza el input con la URL cuando cambia por navegación (p. ej. "Hoy").
  useEffect(() => {
    setBusqueda(q);
  }, [q]);

  // Debounce del buscador: navega 350ms después de dejar de teclear.
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (busqueda.trim() !== q) navegar({ q: busqueda.trim() || null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Switcher de vista */}
      <div className="inline-flex overflow-hidden rounded-lg border border-filo/20">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => navegar({ vista: v.id, ref: null })}
            className={
              "px-3 py-1.5 text-sm transition-colors " +
              (v.id === vista
                ? "bg-profundo text-white"
                : "bg-white text-tinta hover:bg-hielo")
            }
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Navegación temporal */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => navegar({ ref: prevISO })}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[10rem] text-center text-sm font-medium text-tinta">
          {etiqueta}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => navegar({ ref: nextISO })}
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navegar({ ref: null })}
        >
          Hoy
        </Button>
      </div>

      {/* Filtros */}
      <select
        className={selectClass}
        value={sedeId}
        onChange={(e) => navegar({ sede: e.target.value || null })}
        aria-label="Filtrar por pista"
      >
        <option value="">Todas las pistas</option>
        {sedes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={inscripcionId}
        onChange={(e) => navegar({ alumna: e.target.value || null })}
        aria-label="Filtrar por alumna"
      >
        <option value="">Todas las alumnas</option>
        {alumnas.map((a) => (
          <option key={a.inscripcionId} value={a.inscripcionId}>
            {a.nombre}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={tipo}
        onChange={(e) => navegar({ tipo: e.target.value || null })}
        aria-label="Filtrar por tipo"
      >
        <option value="">Todos los tipos</option>
        {TIPOS.map(([valor, label]) => (
          <option key={valor} value={valor}>
            {label}
          </option>
        ))}
      </select>

      {/* Buscador por título */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-filo" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título…"
          aria-label="Buscar eventos"
          className="h-9 w-48 rounded-md border border-filo/40 bg-white pl-8 pr-2 text-sm text-tinta placeholder:text-filo/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2"
        />
      </div>
    </div>
  );
}
