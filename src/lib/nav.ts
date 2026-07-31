// Configuración de navegación por rol (Fase 2).
import type { RolApp } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // nombre de icono lucide (resuelto en el componente)
}

const NAV_MAESTRA: NavItem[] = [
  { href: "/maestra", label: "Inicio", icon: "LayoutDashboard" },
  { href: "/maestra/alumnas", label: "Alumnas", icon: "Users" },
  { href: "/maestra/agenda", label: "Agenda", icon: "CalendarDays" },
  { href: "/maestra/cobranza", label: "Cobranza", icon: "Receipt" },
  {
    href: "/maestra/estados-cuenta",
    label: "Estados de cuenta",
    icon: "FileText",
  },
  { href: "/maestra/competencias", label: "Competencias", icon: "Trophy" },
  { href: "/maestra/ajustes", label: "Ajustes", icon: "Settings" },
];

const NAV_TUTOR: NavItem[] = [
  { href: "/tutor", label: "Inicio", icon: "LayoutDashboard" },
  { href: "/tutor/agenda", label: "Agenda", icon: "CalendarDays" },
  { href: "/tutor/estado-cuenta", label: "Estado de cuenta", icon: "Receipt" },
];

const NAV_ALUMNA: NavItem[] = [
  { href: "/alumna", label: "Inicio", icon: "LayoutDashboard" },
  { href: "/alumna/progreso", label: "Mi progreso", icon: "Sparkles" },
  { href: "/alumna/agenda", label: "Agenda", icon: "CalendarDays" },
];

export function navPorRol(rol: RolApp): NavItem[] {
  switch (rol) {
    case "super_admin":
    case "maestra":
    case "coach_asistente":
      return NAV_MAESTRA;
    case "tutor":
      return NAV_TUTOR;
    case "alumna":
      return NAV_ALUMNA;
  }
}

export function etiquetaRol(rol: RolApp): string {
  switch (rol) {
    case "super_admin":
      return "Administrador";
    case "maestra":
      return "Maestra";
    case "coach_asistente":
      return "Coach asistente";
    case "tutor":
      return "Tutor";
    case "alumna":
      return "Alumna";
  }
}
