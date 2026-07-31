import type { TipoEvento } from "@/types/domain";

export const TIPO_LABEL: Record<TipoEvento, string> = {
  clase: "Clase",
  competencia: "Competencia",
  examen: "Examen",
  evento: "Evento",
  otro: "Otro",
};

// Variantes de badge del design system (default/secondary/success/outline).
export function tipoBadgeVariant(
  tipo: TipoEvento,
): "default" | "secondary" | "success" | "outline" {
  switch (tipo) {
    case "clase":
      return "default";
    case "competencia":
      return "success";
    case "examen":
      return "secondary";
    default:
      return "outline";
  }
}
