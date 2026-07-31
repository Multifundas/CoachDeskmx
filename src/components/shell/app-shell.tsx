import type { ReactNode } from "react";
import type { Sesion } from "@/types/domain";
import { navPorRol } from "@/lib/nav";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";

// Shell del área privada: barra lateral con navegación por rol + encabezado.
export function AppShell({
  sesion,
  children,
}: {
  sesion: Sesion;
  children: ReactNode;
}) {
  const items = navPorRol(sesion.rol);

  return (
    <div
      data-theme={sesion.tema}
      className="flex min-h-screen bg-gradient-to-br from-hielo to-white"
    >
      {/* Barra lateral */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-filo/15 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-filo/15 px-6">
          <span className="font-display text-lg font-bold text-profundo">
            CoachDeskmx
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNav items={items} />
        </div>
        {sesion.tenantNombre ? (
          <div className="border-t border-filo/15 p-4 text-xs text-filo">
            {sesion.tenantNombre}
          </div>
        ) : null}
      </aside>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-filo/15 bg-white px-6">
          <span className="font-display text-base font-semibold text-tinta md:hidden">
            CoachDeskmx
          </span>
          <div className="ml-auto">
            <UserMenu sesion={sesion} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
