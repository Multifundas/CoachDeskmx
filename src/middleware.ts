import { type NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/middleware";

// Refresca la sesión de Supabase en cada request y protege las rutas privadas.
export async function middleware(req: NextRequest) {
  return actualizarSesion(req);
}

export const config = {
  // Ejecuta en todas las rutas salvo assets estáticos. El refresco de token
  // de Supabase debe correr en cada navegación para no perder la sesión.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
