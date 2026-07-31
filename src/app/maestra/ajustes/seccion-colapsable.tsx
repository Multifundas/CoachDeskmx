"use client";

import { useState, type ReactNode } from "react";
import {
  Palette,
  MapPin,
  Clock,
  Trophy,
  DollarSign,
  Tag,
  CheckSquare,
  CalendarClock,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICONOS: Record<string, LucideIcon> = {
  Palette,
  MapPin,
  Clock,
  Trophy,
  DollarSign,
  Tag,
  CheckSquare,
  CalendarClock,
};

/**
 * Card de Ajustes colapsable: cerrada por defecto, se despliega al dar clic en el
 * encabezado. Una acción opcional (p. ej. "Agregar pista") se muestra a la derecha
 * del encabezado sin activar el toggle.
 */
export function SeccionColapsable({
  titulo,
  descripcion,
  icono,
  accion,
  defaultAbierto = false,
  children,
}: {
  titulo: string;
  descripcion: string;
  icono: string;
  accion?: ReactNode;
  defaultAbierto?: boolean;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(defaultAbierto);
  const Icon = ICONOS[icono] ?? Palette;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 p-6">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <ChevronDown
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 text-filo transition-transform",
              abierto ? "rotate-180" : "",
            )}
          />
          <span className="space-y-1.5">
            <span className="flex items-center gap-2 font-display text-lg font-semibold leading-none tracking-tight text-tinta">
              <Icon className="h-5 w-5 text-profundo" />
              {titulo}
            </span>
            <span className="block text-sm text-filo">{descripcion}</span>
          </span>
        </button>
        {accion ? <div className="shrink-0">{accion}</div> : null}
      </div>
      {abierto ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
