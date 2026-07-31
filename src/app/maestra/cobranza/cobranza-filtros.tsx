"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { AlumnaOpcion, EstadoCargo } from "@/types/domain";
import { Label } from "@/components/ui/label";
import { ESTADO_LABEL } from "./cobranza-shared";

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

const ESTADOS: EstadoCargo[] = [
  "pendiente",
  "parcial",
  "pagado",
  "en_corte",
  "cancelado",
];

export function CobranzaFiltros({ alumnas }: { alumnas: AlumnaOpcion[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="filtro-alumna">Alumna</Label>
        <select
          id="filtro-alumna"
          value={params.get("alumna") ?? ""}
          onChange={(e) => setParam("alumna", e.target.value)}
          className={selectClass}
        >
          <option value="">Todas</option>
          {alumnas.map((a) => (
            <option key={a.inscripcionId} value={a.inscripcionId}>
              {a.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filtro-estado">Estado</Label>
        <select
          id="filtro-estado"
          value={params.get("estado") ?? ""}
          onChange={(e) => setParam("estado", e.target.value)}
          className={selectClass}
        >
          <option value="">Todos (excepto cancelados)</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filtro-periodo">Periodo</Label>
        <input
          id="filtro-periodo"
          type="month"
          value={params.get("periodo") ?? ""}
          onChange={(e) => setParam("periodo", e.target.value)}
          className={selectClass}
        />
      </div>
    </div>
  );
}
