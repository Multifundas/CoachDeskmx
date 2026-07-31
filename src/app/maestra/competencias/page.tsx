import Link from "next/link";
import { CalendarPlus, ChevronRight, Trophy } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import { listarCompetencias } from "@/lib/data/competencias";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NuevaCompetencia } from "./competencia-form";
import { formatFecha } from "./competencias-shared";

export default async function CompetenciasPage() {
  await requireRol(["super_admin", "maestra", "coach_asistente"]);

  const competencias = await listarCompetencias();
  const hoy = new Date().toISOString().slice(0, 10);
  const proximas = competencias.filter((c) => c.fecha && c.fecha >= hoy).length;
  const totalInscritas = competencias.reduce((s, c) => s + c.inscritas, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">
            Competencias
          </h1>
          <p className="text-sm text-filo">
            Registra competencias e inscribe a las alumnas que competirán.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/maestra/competencias/importar">
              <CalendarPlus className="h-4 w-4" />
              Importar calendario
            </Link>
          </Button>
          <NuevaCompetencia />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard titulo="Competencias" valor={competencias.length} hint="Registradas" />
        <KpiCard titulo="Próximas" valor={proximas} hint="De hoy en adelante" />
        <KpiCard titulo="Inscripciones" valor={totalInscritas} hint="Alumnas inscritas" />
      </div>

      <Card>
        <CardContent className="pt-6">
          {competencias.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Trophy className="h-8 w-8 text-filo" />
              <p className="text-sm text-filo">
                Aún no hay competencias. Crea la primera para empezar.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-filo/15">
              {competencias.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/maestra/competencias/${c.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-hielo/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-tinta">
                        {c.nombre}
                      </p>
                      <p className="text-xs text-filo">
                        {formatFecha(c.fecha)}
                        {c.sede ? ` · ${c.sede}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {c.inscritas}{" "}
                        {c.inscritas === 1 ? "inscrita" : "inscritas"}
                      </Badge>
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
