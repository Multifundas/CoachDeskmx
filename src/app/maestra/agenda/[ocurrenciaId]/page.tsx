import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import { obtenerOcurrencia } from "@/lib/data/agenda";
import { obtenerAsistenciaDefault } from "@/lib/data/tenant-config";
import { horaLocal, fechaLocalISO } from "@/lib/agenda-tz";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TIPO_LABEL, tipoBadgeVariant } from "../agenda-shared";
import { AsistenciaForm } from "../asistencia-form";

// Etiqueta legible de una fecha ISO 'YYYY-MM-DD'.
function tituloDia(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(Date.UTC(y!, (m ?? 1) - 1, d!, 12));
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

export default async function OcurrenciaDetallePage({
  params,
}: {
  params: { ocurrenciaId: string };
}) {
  await requireRol(["super_admin", "maestra", "coach_asistente"]);

  const [o, modoDefault] = await Promise.all([
    obtenerOcurrencia(params.ocurrenciaId),
    obtenerAsistenciaDefault(),
  ]);
  if (!o) notFound();

  const dia = fechaLocalISO(o.inicioUtc, o.timezoneSede);
  const cancelada = o.estado === "cancelado";
  const presentes = o.asistencias.filter((a) => a.estado === "presente").length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/maestra/agenda"
          className="inline-flex items-center gap-1 text-sm text-filo hover:text-tinta"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la agenda
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-tinta">
            <span className={cancelada ? "line-through opacity-60" : ""}>
              {o.titulo}
            </span>
            <Badge variant={tipoBadgeVariant(o.tipo)}>{TIPO_LABEL[o.tipo]}</Badge>
            {cancelada ? <Badge variant="outline">Cancelada</Badge> : null}
          </h1>
          <p className="text-sm capitalize text-filo">{tituloDia(dia)}</p>
          <p className="tabular text-sm text-filo">
            {horaLocal(o.inicioUtc, o.timezoneSede)}–
            {horaLocal(o.finUtc, o.timezoneSede)}
            {o.sedeNombre ? ` · ${o.sedeNombre}` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Asistencia
            <span className="ml-2 text-sm font-normal text-filo">
              {presentes} de {o.asistencias.length} presentes
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AsistenciaForm
            ocurrenciaId={o.ocurrenciaId}
            asistencias={o.asistencias}
            modoDefault={modoDefault}
          />
        </CardContent>
      </Card>
    </div>
  );
}
