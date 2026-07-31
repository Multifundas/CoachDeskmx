import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import {
  obtenerMiInscripcionAlumna,
  proximasClasesInscripcion,
} from "@/lib/data/dashboard";
import { formatEnSede } from "@/lib/tz";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AlumnaAgendaPage() {
  await requireRol(["alumna"]);
  const inscripcion = await obtenerMiInscripcionAlumna();

  const proximas = inscripcion
    ? await proximasClasesInscripcion(inscripcion.inscripcionId, 50)
    : [];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/alumna">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </Button>

      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">Mi agenda</h1>
        <p className="text-sm text-filo">Próximas clases.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximas clases</CardTitle>
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
  );
}
