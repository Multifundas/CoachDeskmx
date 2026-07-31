import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import { listarEstadosCuenta } from "@/lib/data/estados-cuenta";
import { listarAlumnasOpciones } from "@/lib/data/cobranza";
import { listarConceptos } from "@/lib/data/conceptos";
import { formatMXN } from "@/lib/money";
import { KpiCard } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CorteForm } from "./corte-form";

export default async function EstadosCuentaPage() {
  await requireRol(["super_admin", "maestra"]);

  const [edcs, alumnas, conceptos] = await Promise.all([
    listarEstadosCuenta(),
    listarAlumnasOpciones(),
    listarConceptos(),
  ]);

  const totalSellado = edcs.reduce((s, e) => s + e.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">
          Estados de cuenta
        </h1>
        <p className="text-sm text-filo">
          Genera el corte mensual de una alumna. El estado de cuenta congela los
          cargos del periodo con un folio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard titulo="Estados" valor={edcs.length} hint="Sellados" />
        <KpiCard
          titulo="Total sellado"
          valor={formatMXN(totalSellado)}
          hint="Suma de cortes"
          mono
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generar corte</CardTitle>
          <CardDescription>
            Elige alumna y periodo, agrega conceptos extra si hace falta y sella
            el estado de cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CorteForm alumnas={alumnas} conceptos={conceptos} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {edcs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-8 w-8 text-filo" />
              <p className="text-sm text-filo">
                Aún no hay estados de cuenta. Genera el primero arriba.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-filo/15">
              {edcs.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/maestra/estados-cuenta/${e.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-hielo/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-tinta">
                        {e.alumna}
                      </p>
                      <p className="text-xs text-filo">
                        Folio {e.folio} · {e.periodo}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="money text-sm text-tinta">
                        {formatMXN(e.total)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-filo" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
