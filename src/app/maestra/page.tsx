import { requireRol } from "@/lib/auth/guard";
import {
  listarInscripciones,
  listarCargos,
  listarOcurrencias,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default async function MaestraDashboard() {
  const sesion = await requireRol([
    "super_admin",
    "maestra",
    "coach_asistente",
  ]);

  // RLS aísla por tenant a partir del JWT del usuario: no pasamos tenantId.
  const [inscripciones, cargos, ocurrencias] = await Promise.all([
    listarInscripciones(),
    listarCargos(),
    listarOcurrencias(),
  ]);

  const activas = inscripciones.filter((i) => i.estado === "activa").length;
  const porCobrar = inscripciones.reduce((s, i) => s + i.saldoMxn, 0);
  const cargosPendientes = cargos.filter((c) => c.estado !== "pagado").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">
          Hola, {sesion.nombre.split(" ")[0]}
        </h1>
        <p className="text-sm text-filo">Resumen de {sesion.tenantNombre}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard titulo="Alumnas activas" valor={activas} hint={`${inscripciones.length} inscritas`} />
        <KpiCard titulo="Por cobrar" valor={formatMXN(porCobrar)} mono hint={`${cargosPendientes} cargos pendientes`} />
        <KpiCard titulo="Clases próximas" valor={ocurrencias.length} hint="Agenda de esta semana" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alumnas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscripciones.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium text-tinta">
                      {i.persona.nombre} {i.persona.apellidos}
                    </TableCell>
                    <TableCell>{i.persona.nivelActual ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          i.estado === "activa"
                            ? "success"
                            : i.estado === "pausada"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {i.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="money text-right">
                      {formatMXN(i.saldoMxn)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas clases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clase</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Cuándo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ocurrencias.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium text-tinta">
                      {o.titulo}
                    </TableCell>
                    <TableCell>{o.sede}</TableCell>
                    <TableCell className="tabular">
                      {formatEnSede(o.inicioUtc, o.timezoneSede)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
