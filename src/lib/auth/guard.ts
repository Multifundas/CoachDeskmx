import "server-only";
import { redirect } from "next/navigation";
import type { RolApp, Sesion } from "@/types/domain";
import { getSesion, rutaInicioPorRol } from "@/lib/auth/session";

// Exige sesión con uno de los roles permitidos. Redirige si no cumple.
export async function requireRol(rolesPermitidos: RolApp[]): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (!rolesPermitidos.includes(sesion.rol)) {
    // Rol no autorizado para esta sección: enviar a su propio inicio.
    redirect(rutaInicioPorRol(sesion.rol));
  }
  return sesion;
}
