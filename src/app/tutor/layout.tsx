import type { ReactNode } from "react";
import { requireRol } from "@/lib/auth/guard";
import { AppShell } from "@/components/shell/app-shell";

export default async function TutorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sesion = await requireRol(["tutor"]);
  return <AppShell sesion={sesion}>{children}</AppShell>;
}
