import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Tarjeta de indicador para los tableros.
export function KpiCard({
  titulo,
  valor,
  hint,
  mono = false,
}: {
  titulo: string;
  valor: ReactNode;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      {/* Acento de color a la izquierda para dar vida al tablero. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 bg-profundo"
      />
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-filo">
          {titulo}
        </p>
        <p
          className={cn(
            "mt-2 text-2xl font-bold text-profundo",
            mono && "money",
          )}
        >
          {valor}
        </p>
        {hint ? <p className="mt-1 text-xs text-filo">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
