import Link from "next/link";
import { requireRol } from "@/lib/auth/guard";
import { listarAlumnas, listarNiveles } from "@/lib/data/alumnas";
import { fechaDia, calcularEdad } from "@/lib/fecha";
import { calcularCategoria } from "@/lib/categoria";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AgregarAlumna, EditarAlumna } from "./alumna-form";
import { ImportarAlumnas } from "./importar-alumnas";
import { EstadisticasAlumnas } from "./estadisticas";

export default async function AlumnasPage() {
  await requireRol(["super_admin", "maestra", "coach_asistente"]);

  const [alumnas, niveles] = await Promise.all([
    listarAlumnas(),
    listarNiveles(),
  ]);

  const activas = alumnas.filter((a) => a.estado === "activa").length;
  const pausadas = alumnas.filter((a) => a.estado === "pausada").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">Alumnas</h1>
          <p className="text-sm text-filo">
            Gestiona las inscripciones de tu escuela.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportarAlumnas />
          <AgregarAlumna niveles={niveles} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard titulo="Activas" valor={activas} hint={`${alumnas.length} inscritas`} />
        <KpiCard titulo="Pausadas" valor={pausadas} />
        <KpiCard titulo="Total" valor={alumnas.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscripciones</CardTitle>
        </CardHeader>
        <CardContent>
          {alumnas.length === 0 ? (
            <p className="py-8 text-center text-sm text-filo">
              Aún no tienes alumnas. Usa “Agregar alumna” para empezar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead className="text-right">Edad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alumnas.map((a) => {
                  const edad = calcularEdad(a.fechaNacimiento);
                  const categoria = calcularCategoria(a.fechaNacimiento);
                  return (
                    <TableRow key={a.inscripcionId} className="align-top">
                      <TableCell className="font-medium text-tinta">
                        <Link
                          href={`/maestra/alumnas/${a.inscripcionId}`}
                          className="hover:text-profundo hover:underline"
                        >
                          {a.nombre} {a.apellidos}
                        </Link>
                      </TableCell>
                      <TableCell>{a.nivelActual ?? "—"}</TableCell>
                      <TableCell>
                        {categoria ? (
                          <Badge variant="outline">
                            {categoria.categoriaEdad.nombre}
                          </Badge>
                        ) : (
                          <span className="text-filo">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.estado === "activa"
                              ? "success"
                              : a.estado === "pausada"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {a.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>{fechaDia(a.fechaAlta)}</TableCell>
                      <TableCell className="text-right">
                        {edad !== null ? `${edad} años` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <EditarAlumna alumna={a} niveles={niveles} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {alumnas.length > 0 ? <EstadisticasAlumnas alumnas={alumnas} /> : null}
    </div>
  );
}
