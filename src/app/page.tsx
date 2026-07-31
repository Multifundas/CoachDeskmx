import { redirect } from "next/navigation";
import { getSesion, rutaInicioPorRol } from "@/lib/auth/session";

export default async function HomePage() {
  const sesion = await getSesion();
  if (sesion) redirect(rutaInicioPorRol(sesion.rol));
  redirect("/login");
}
