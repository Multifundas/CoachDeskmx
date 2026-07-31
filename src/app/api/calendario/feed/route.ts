import { NextResponse, type NextRequest } from "next/server";
import { generarICS } from "@/lib/ics";
import {
  tenantPorTokenFeed,
  eventosParaFeed,
} from "@/lib/data/calendario-feed";

// Feed ICS público de suscripción (Google/Apple Calendar). Se autentica con el
// ?token= (validado contra conexiones_calendario con service_role, saltando RLS
// solo tras validar). Solo-lectura: expone los eventos del tenant en UTC.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const tenantId = await tenantPorTokenFeed(token);
  if (!tenantId) {
    // No revelar si el token existió: 404 genérico.
    return new NextResponse("Not found", { status: 404 });
  }

  const eventos = await eventosParaFeed(tenantId);
  const ics = generarICS(eventos);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="coachdesk.ics"',
      "cache-control": "no-store",
    },
  });
}
