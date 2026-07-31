import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import {
  obtenerCompetencia,
  listarInscritas,
  listarTarifasNivel,
  listarAlumnasInscribibles,
} from "@/lib/data/competencias";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "../competencias-shared";
import { InscribirAlumna } from "./inscripcion-form";
import { QuitarInscripcion } from "./quitar-inscripcion";

export default async function CompetenciaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  await requireRol(["super_admin", "maestra", "coach_asistente"]);

  const competencia = await obtenerCompetencia(params.id);
  if (!competencia) notFound();

  const [inscritas, tarifas, inscribibles] = await Promise.all([
    listarInscritas(params.id),
    listarTarifasNivel(),
    listarAlumnasInscribibles(params.id),
  ]);

  // Mapa nivel -> cuota para mostrar la cuota por fila y alimentar el form.
  const cuotaPorNivel = new Map(tarifas.map((t) => [t.nivelId, t.monto]));
  const niveles = tarifas.map((t) => ({
    id: t.nivelId,
    nombre: t.nivelNombre,
    monto: t.monto,
  }));
  const alumnas = inscribibles.map((a) => ({
    inscripcionId: a.inscripcionId,
    nombre: a.nombre,
    nivelActualId: a.nivelActualId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/maestra/competencias"
          className="inline-flex items-center gap-1 text-sm text-filo transition-colors hover:text-tinta"
        >
          <ArrowLeft className="h-4 w-4" />
          Competencias
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">
            {competencia.nombre}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-filo">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {formatFecha(competencia.fecha)}
            </span>
            {competencia.sede ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {competencia.sede}
              </span>
            ) : null}
          </div>
        </div>
        <InscribirAlumna
          competenciaId={competencia.id}
          alumnas={alumnas}
          niveles={niveles}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-tinta">
              Alumnas inscritas
            </h2>
            <Badge variant="secondary">{inscritas.length}</Badge>
          </div>

          {inscritas.length === 0 ? (
            <p className="py-8 text-center text-sm text-filo">
              Aún no hay alumnas inscritas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumna</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscritas.map((i) => {
                  const cuota = i.nivelId
                    ? cuotaPorNivel.get(i.nivelId) ?? null
                    : null;
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium text-tinta">
                        {i.nombre}
                      </TableCell>
                      <TableCell>{i.nivelNombre ?? "—"}</TableCell>
                      <TableCell>{i.categoria ?? "—"}</TableCell>
                      <TableCell className="money">
                        {cuota == null ? "—" : `$${cuota.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        <QuitarInscripcion
                          inscripcionCompetenciaId={i.id}
                          competenciaId={competencia.id}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 text-xs text-filo">
            Al quitar una inscripción, el cargo generado permanece en Cobranza;
            cancélalo desde ahí si corresponde.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
