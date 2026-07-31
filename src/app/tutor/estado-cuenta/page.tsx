import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import { listarInscripcionesTutor } from "@/lib/data/dashboard";
import { listarEstadosCuenta } from "@/lib/data/estados-cuenta";
import { formatMXN } from "@/lib/money";
import { formatFecha } from "@/lib/tz";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TutorEstadoCuentaPage() {
  await requireRol(["tutor"]);
  // RLS limita ambos: inscripciones de sus alumnas y sus estados de cuenta.
  const [inscripciones, estados] = await Promise.all([
    listarInscripcionesTutor(),
    listarEstadosCuenta(),
  ]);
  const saldoTotal = inscripciones.reduce((s, i) => s + i.saldoMxn, 0);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/tutor">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </Button>

      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">
          Estado de cuenta
        </h1>
        <p className="text-sm text-filo">Saldos y cortes por alumna.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard titulo="Saldo total" valor={formatMXN(saldoTotal)} mono />
        <KpiCard titulo="Cortes sellados" valor={estados.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo actual por alumna</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inscripciones.length === 0 ? (
            <p className="text-sm text-filo">Sin alumnas a tu cargo.</p>
          ) : (
            inscripciones.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-md border border-filo/15 p-3"
              >
                <span className="text-sm text-tinta">
                  {i.persona.nombre} {i.persona.apellidos}
                </span>
                <span className="money text-sm font-medium text-tinta">
                  {formatMXN(i.saldoMxn)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estados de cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {estados.length === 0 ? (
            <p className="text-sm text-filo">Aún no hay cortes sellados.</p>
          ) : (
            estados.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-md border border-filo/15 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-tinta">{e.alumna}</p>
                  <p className="text-xs text-filo">
                    {e.periodo} · Folio {e.folio} ·{" "}
                    {formatFecha(e.selladoAtUtc)}
                  </p>
                </div>
                <span className="money text-sm font-medium text-tinta">
                  {formatMXN(e.total)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
