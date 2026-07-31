import type { ReactNode } from "react";
import { requireRol } from "@/lib/auth/guard";
import { AppShell } from "@/components/shell/app-shell";

export default async function MaestraLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sesion = await requireRol([
    "super_admin",
    "maestra",
    "coach_asistente",
  ]);
  return <AppShell sesion={sesion}>{children}</AppShell>;
}
