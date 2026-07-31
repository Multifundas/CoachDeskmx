import { requireRol } from "@/lib/auth/guard";
import {
  listarCargos,
  listarAlumnasOpciones,
  type FiltrosCargos,
} from "@/lib/data/cobranza";
import { formatMXN } from "@/lib/money";
import type { EstadoCargo } from "@/types/domain";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { CobranzaFiltros } from "./cobranza-filtros";
import { CobranzaTabla } from "./cobranza-tabla";
import { RegistrarPagoDialog } from "./pago-form";

const ESTADOS_VALIDOS: EstadoCargo[] = [
  "pendiente",
  "pagado",
  "parcial",
  "cancelado",
  "en_corte",
];

export default async function CobranzaPage({
  searchParams,
}: {
  searchParams: { alumna?: string; estado?: string; periodo?: string };
}) {
  await requireRol(["super_admin", "maestra", "coach_asistente"]);

  const filtros: FiltrosCargos = {};
  if (searchParams.alumna) filtros.inscripcionId = searchParams.alumna;
  if (
    searchParams.estado &&
    (ESTADOS_VALIDOS as string[]).includes(searchParams.estado)
  ) {
    filtros.estado = searchParams.estado as EstadoCargo;
  }
  if (searchParams.periodo) filtros.periodo = searchParams.periodo;

  const [cargos, alumnas] = await Promise.all([
    listarCargos(filtros),
    listarAlumnasOpciones(),
  ]);

  // Cargos abiertos (con saldo) para el diálogo de pago: todos los pendientes/parciales.
  const cargosAbiertos = await listarCargos({});
  const abiertos = cargosAbiertos.filter(
    (c) => c.saldo > 0 && c.estado !== "en_corte" && c.estado !== "cancelado",
  );

  const pendientes = cargos.filter(
    (c) => c.estado === "pendiente" || c.estado === "parcial",
  );
  const totalSaldo = cargos.reduce((s, c) => s + c.saldo, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">
            Cobranza
          </h1>
          <p className="text-sm text-filo">
            Cargos de tus alumnas. Registra pagos y abonos parciales.
          </p>
        </div>
        <RegistrarPagoDialog alumnas={alumnas} cargosAbiertos={abiertos} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard titulo="Cargos" valor={cargos.length} hint="En la vista" />
        <KpiCard
          titulo="Con saldo"
          valor={pendientes.length}
          hint="Pendientes o parciales"
        />
        <KpiCard
          titulo="Por cobrar"
          valor={formatMXN(totalSaldo)}
          hint="Suma de saldos"
          mono
        />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <CobranzaFiltros alumnas={alumnas} />
          <CobranzaTabla cargos={cargos} />
        </CardContent>
      </Card>
    </div>
  );
}
