"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckSquare, Clock, MapPin } from "lucide-react";
import type { OcurrenciaAgenda } from "@/types/domain";
import { fechaLocalISO, horaLocal } from "@/lib/agenda-tz";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TIPO_LABEL, tipoBadgeVariant } from "./agenda-shared";

// Etiqueta legible de una fecha ISO 'YYYY-MM-DD'.
function tituloDia(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(Date.UTC(y!, (m ?? 1) - 1, d!, 12));
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

/**
 * Envuelve el contenido de un evento en un disparador que abre un pop-up con la
 * info completa (día, horario, sede, estado) y enlaces de acción. No hace fetch:
 * usa los datos ya presentes en la ocurrencia. El `children` es el bloque
 * clicable (título/celda) que ya renderiza cada vista.
 */
export function EventoPopup({
  ocurrencia: o,
  children,
  className,
}: {
  ocurrencia: OcurrenciaAgenda;
  children: ReactNode;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  const dia = fechaLocalISO(o.inicioUtc, o.timezoneSede);
  const cancelada = o.estado === "cancelado";

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={
          "block w-full min-w-0 text-left " + (className ?? "")
        }
      >
        {children}
      </button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span className={cancelada ? "line-through opacity-60" : ""}>
                {o.titulo}
              </span>
              <Badge variant={tipoBadgeVariant(o.tipo)}>
                {TIPO_LABEL[o.tipo]}
              </Badge>
              {o.esSerie ? <Badge variant="outline">Serie</Badge> : null}
              {cancelada ? <Badge variant="outline">Cancelada</Badge> : null}
            </DialogTitle>
            <DialogDescription className="capitalize">
              {tituloDia(dia)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-tinta">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-filo" />
              <span className="tabular">
                {horaLocal(o.inicioUtc, o.timezoneSede)}–
                {horaLocal(o.finUtc, o.timezoneSede)}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-filo" />
              {o.sedeNombre ?? "Sin pista asignada"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href={`/maestra/agenda/${o.ocurrenciaId}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-profundo px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <CheckSquare className="h-4 w-4" />
              Ver asistencia
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
