import Link from "next/link";
import { CalendarDays, Receipt } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import {
  listarInscripcionesTutor,
  proximasClasesInscripcion,
} from "@/lib/data/dashboard";
import { formatMXN } from "@/lib/money";
import { formatEnSede } from "@/lib/tz";
import { KpiCard } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TutorDashboard() {
  const sesion = await requireRol(["tutor"]);
  // RLS limita a las inscripciones de las personas a cargo de este tutor.
  const inscripciones = await listarInscripcionesTutor();
  const saldoTotal = inscripciones.reduce((s, i) => s + i.saldoMxn, 0);

  // Próxima clase de cualquiera de sus alumnas (la más cercana).
  const listas = await Promise.all(
    inscripciones.map((i) => proximasClasesInscripcion(i.id, 1)),
  );
  const proxima =
    listas
      .flat()
      .sort((a, b) => a.inicioUtc.localeCompare(b.inicioUtc))[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">
          Hola, {sesion.nombre.split(" ")[0]}
        </h1>
        <p className="text-sm text-filo">Panel de tutor.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Alumnas a tu cargo" valor={inscripciones.length} />
        <KpiCard titulo="Saldo total" valor={formatMXN(saldoTotal)} mono />
        <KpiCard
          titulo="Próxima clase"
          valor={
            proxima
              ? formatEnSede(proxima.inicioUtc, proxima.timezoneSede)
              : "Sin clases"
          }
          hint={proxima?.sede}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/tutor/agenda"
          className="flex items-center gap-3 rounded-lg border border-filo/15 p-4 transition-colors hover:bg-hielo/40"
        >
          <CalendarDays className="h-5 w-5 text-logro" />
          <div>
            <p className="font-medium text-tinta">Agenda</p>
            <p className="text-xs text-filo">Próximas clases de tus alumnas.</p>
          </div>
        </Link>
        <Link
          href="/tutor/estado-cuenta"
          className="flex items-center gap-3 rounded-lg border border-filo/15 p-4 transition-colors hover:bg-hielo/40"
        >
          <Receipt className="h-5 w-5 text-logro" />
          <div>
            <p className="font-medium text-tinta">Estado de cuenta</p>
            <p className="text-xs text-filo">Cargos y cortes por alumna.</p>
          </div>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscripciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inscripciones.length === 0 ? (
            <p className="text-sm text-filo">
              Aún no hay alumnas ligadas a tu cuenta.
            </p>
          ) : (
            inscripciones.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-md border border-filo/15 p-3"
              >
                <div>
                  <p className="font-medium text-tinta">
                    {i.persona.nombre} {i.persona.apellidos}
                  </p>
                  <p className="text-xs text-filo">
                    Nivel {i.persona.nivelActual ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={i.estado === "activa" ? "success" : "secondary"}
                  >
                    {i.estado}
                  </Badge>
                  <span className="money text-sm font-medium text-tinta">
                    {formatMXN(i.saldoMxn)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
