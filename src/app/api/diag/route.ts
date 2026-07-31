import { NextResponse } from "next/server";

// TEMPORAL: diagnóstico de variables de entorno en producción.
// No expone secretos: solo longitudes y prefijos.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return NextResponse.json({
    urlPresente: url.length > 0,
    urlValor: url,
    anonPresente: anon.length > 0,
    anonLargo: anon.length,
    anonTrimDistinto: anon !== anon.trim(),
    servicePresente: service.length > 0,
    serviceLargo: service.length,
    appUrl,
  });
}
