import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import {
  listarInscripcionesTutor,
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

export default async function TutorAgendaPage() {
  await requireRol(["tutor"]);
  const inscripciones = await listarInscripcionesTutor();

  // Próximas clases de todas las alumnas, con el nombre de la alumna.
  const listas = await Promise.all(
    inscripciones.map(async (i) => {
      const clases = await proximasClasesInscripcion(i.id, 50);
      return clases.map((o) => ({
        ...o,
        alumna: `${i.persona.nombre} ${i.persona.apellidos}`,
      }));
    }),
  );
  const proximas = listas
    .flat()
    .sort((a, b) => a.inicioUtc.localeCompare(b.inicioUtc));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/tutor">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </Button>

      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">Agenda</h1>
        <p className="text-sm text-filo">Próximas clases de tus alumnas.</p>
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
                  <p className="text-sm font-medium text-tinta">{o.alumna}</p>
                  <p className="text-xs text-filo">
                    {o.titulo} · {o.sede}
                  </p>
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
