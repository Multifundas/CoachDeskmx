// Cliente de Supabase para el middleware (Edge). Refresca la sesión en cada
// request y sincroniza las cookies de auth entre request y response.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas del área privada. Sin sesión válida se redirige a /login.
const RUTAS_PRIVADAS = ["/maestra", "/tutor", "/alumna"];

export async function actualizarSesion(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value),
          );
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no ejecutar código entre createServerClient y getUser().
  // getUser() revalida el token contra Supabase y refresca cookies si aplica.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const esPrivada = RUTAS_PRIVADAS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );

  if (esPrivada && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Devolver siempre `res` para conservar las cookies refrescadas.
  return res;
}
