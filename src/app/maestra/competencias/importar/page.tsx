import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import { CALENDARIO_FEMEPASHIDI_2026_2027 } from "@/lib/data/calendario-femepashidi";
import { Card, CardContent } from "@/components/ui/card";
import { ImportarEditor } from "./importar-editor";

export default async function ImportarCompetenciasPage() {
  await requireRol(["super_admin", "maestra", "coach_asistente"]);

  const filas = CALENDARIO_FEMEPASHIDI_2026_2027;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/maestra/competencias"
          className="inline-flex items-center gap-1 text-sm text-filo transition-colors hover:text-tinta"
        >
          <ChevronLeft className="h-4 w-4" />
          Competencias
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-tinta">
          Importar calendario 2026/2027
        </h1>
        <p className="text-sm text-filo">
          Calendario oficial FEMEPASHIDI. Revisa y edita cada fila; marca las que
          quieras agregar. Al importar se registran y aparecen en la Agenda.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ImportarEditor filas={filas} />
        </CardContent>
      </Card>
    </div>
  );
}
