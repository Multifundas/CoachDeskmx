import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSesion, rutaInicioPorRol } from "@/lib/auth/session";

// Destino del enlace mágico. Intercambia el `code` por una sesión y redirige
// al panel correspondiente según el rol del usuario.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Enlace inválido o expirado.")}`,
    );
  }

  // Resolver rol para enviar al panel correcto.
  const sesion = await getSesion();
  const destino = sesion ? rutaInicioPorRol(sesion.rol) : "/login";
  return NextResponse.redirect(`${origin}${destino}`);
}
