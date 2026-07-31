import Link from "next/link";
import { CalendarDays, Trophy } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import {
  obtenerMiInscripcionAlumna,
  proximasClasesInscripcion,
} from "@/lib/data/dashboard";
import { obtenerDesempeno } from "@/lib/data/desempeno";
import { formatEnSede } from "@/lib/tz";
import { KpiCard } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AlumnaDashboard() {
  const sesion = await requireRol(["alumna"]);
  const inscripcion = await obtenerMiInscripcionAlumna();

  if (!inscripcion) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">
            Hola, {sesion.nombre.split(" ")[0]}
          </h1>
          <p className="text-sm text-filo">Tu progreso en el hielo.</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-sm text-filo">
            Aún no hay una inscripción ligada a tu cuenta. Pídele a tu maestra
            que te dé acceso.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [desempeno, proximas] = await Promise.all([
    obtenerDesempeno(inscripcion.inscripcionId),
    proximasClasesInscripcion(inscripcion.inscripcionId, 5),
  ]);

  const proxima = proximas[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">
          Hola, {sesion.nombre.split(" ")[0]}
        </h1>
        <p className="text-sm text-filo">Tu progreso en el hielo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          titulo="Nivel actual"
          valor={inscripcion.nivelActual ?? "—"}
        />
        <KpiCard
          titulo="Progreso al próximo nivel"
          valor={desempeno ? `${desempeno.progresoPct}%` : "—"}
          hint={desempeno?.proximoNivel ?? undefined}
        />
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Camino al próximo nivel</CardTitle>
            <Link
              href="/alumna/progreso"
              className="inline-flex items-center gap-1 text-sm font-medium text-logro transition-colors hover:underline"
            >
              <Trophy className="h-4 w-4" />
              Ver progreso
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {desempeno?.proximoNivel ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-filo">Próximo nivel</span>
                  <span className="font-medium text-tinta">
                    {desempeno.proximoNivel}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-hielo">
                  <div
                    className="h-full rounded-full bg-logro"
                    style={{ width: `${desempeno.progresoPct}%` }}
                  />
                </div>
                <p className="text-xs text-filo">
                  {desempeno.elementos.length} elementos del examen.
                </p>
              </>
            ) : (
              <p className="text-sm text-filo">
                Aún no hay un próximo nivel configurado.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Próximas clases</CardTitle>
            <Link
              href="/alumna/agenda"
              className="inline-flex items-center gap-1 text-sm font-medium text-logro transition-colors hover:underline"
            >
              <CalendarDays className="h-4 w-4" />
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {proximas.length === 0 ? (
              <p className="text-sm text-filo">No hay clases programadas.</p>
            ) : (
              proximas.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-md border border-filo/15 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-tinta">{o.titulo}</p>
                    <p className="text-xs text-filo">{o.sede}</p>
                  </div>
                  <span className="text-xs text-filo">
                    {formatEnSede(o.inicioUtc, o.timezoneSede)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
