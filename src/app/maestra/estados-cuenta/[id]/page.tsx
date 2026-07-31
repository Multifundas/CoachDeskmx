import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import { obtenerEstadoCuenta } from "@/lib/data/estados-cuenta";
import { formatMXN } from "@/lib/money";
import { formatEnSede } from "@/lib/tz";
import { CompartirEdc } from "./compartir";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ORIGEN_LABEL: Record<string, string> = {
  clase: "Clase",
  cancelacion: "Cancelación",
  inscripcion: "Inscripción",
  competencia: "Competencia",
  manual: "Manual",
};

// El concepto del snapshot puede venir como string (forma nueva) o como el
// objeto crudo del join `{ nombre }` (cortes viejos). Normaliza a texto.
function nombreConcepto(concepto: unknown): string {
  if (typeof concepto === "string") return concepto;
  if (
    concepto &&
    typeof concepto === "object" &&
    "nombre" in concepto &&
    typeof (concepto as { nombre: unknown }).nombre === "string"
  ) {
    return (concepto as { nombre: string }).nombre;
  }
  return "—";
}

export default async function EstadoCuentaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  await requireRol(["super_admin", "maestra"]);

  const edc = await obtenerEstadoCuenta(params.id);
  if (!edc) notFound();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/maestra/estados-cuenta"
          className="inline-flex items-center gap-1 text-sm text-filo transition-colors hover:text-tinta"
        >
          <ChevronLeft className="h-4 w-4" />
          Estados de cuenta
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-tinta">
              {edc.alumna}
            </h1>
            <p className="text-sm text-filo">
              Folio {edc.folio} · Periodo {edc.periodo}
            </p>
          </div>
          <CompartirEdc edcId={edc.id} alumna={edc.alumna} appUrl={appUrl} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edc.snapshot.cargos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-tinta">
                    {nombreConcepto(c.concepto)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-filo">
                    {c.fechaUtc
                      ? formatEnSede(c.fechaUtc, c.timezone ?? undefined)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-filo">
                    {c.ubicacion ?? "—"}
                  </TableCell>
                  <TableCell>{ORIGEN_LABEL[c.origen] ?? c.origen}</TableCell>
                  <TableCell>{c.estado}</TableCell>
                  <TableCell className="money text-right">
                    {formatMXN(c.monto)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} className="text-right font-medium">
                  Total
                </TableCell>
                <TableCell className="money text-right font-bold text-tinta">
                  {formatMXN(edc.total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
