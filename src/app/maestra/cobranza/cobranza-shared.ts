import type { EstadoCargo, OrigenCargo } from "@/types/domain";
import type { BadgeProps } from "@/components/ui/badge";

export const ESTADO_LABEL: Record<EstadoCargo, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  parcial: "Parcial",
  cancelado: "Cancelado",
  en_corte: "En corte",
};

export const ESTADO_VARIANT: Record<EstadoCargo, BadgeProps["variant"]> = {
  pendiente: "alerta",
  pagado: "success",
  parcial: "default",
  cancelado: "outline",
  en_corte: "secondary",
};

export const ORIGEN_LABEL: Record<OrigenCargo, string> = {
  clase: "Clase",
  cancelacion: "Cancelación",
  inscripcion: "Inscripción",
  competencia: "Competencia",
  manual: "Manual",
};
