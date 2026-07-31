import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// TEMPORAL: diagnóstico de env vars + login server-side en producción.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Intento de login igual que la app (sin cookies persistentes).
  let loginResultado = "no probado";
  try {
    const supabase = createServerClient(url, anon, {
      cookies: { getAll: () => [], setAll: () => {} },
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "papa.perez@example.com",
      password: "Demo1234!",
    });
    loginResultado = error
      ? `ERROR: ${error.message} (${error.status})`
      : `OK sesion=${!!data.session}`;
  } catch (e) {
    loginResultado = `EXCEPCION: ${(e as Error).message}`;
  }

  return NextResponse.json({
    urlValor: url,
    urlTrimDistinto: url !== url.trim(),
    anonLargo: anon.length,
    anonTrimDistinto: anon !== anon.trim(),
    loginResultado,
  });
}
