import type { ReactNode } from "react";
import { requireRol } from "@/lib/auth/guard";
import { AppShell } from "@/components/shell/app-shell";

export default async function AlumnaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sesion = await requireRol(["alumna"]);
  return <AppShell sesion={sesion}>{children}</AppShell>;
}
