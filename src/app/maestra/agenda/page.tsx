import { requireRol } from "@/lib/auth/guard";
import {
  listarSedes,
  listarAlumnasOpciones,
  listarOcurrenciasRango,
} from "@/lib/data/agenda";
import { listarConceptos } from "@/lib/data/conceptos";
import { esVista, calcularRango, type VistaAgenda } from "@/lib/agenda-rango";
import type { TipoEvento } from "@/types/domain";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { TIPO_LABEL } from "./agenda-shared";
import { AgendaToolbar } from "./agenda-toolbar";
import { NuevaClase } from "./clase-form";
import { VistaLista } from "./vista-lista";
import { VistaSemana } from "./vista-semana";
import { VistaMes } from "./vista-mes";

function esTipoEvento(v: string): v is TipoEvento {
  return v in TIPO_LABEL;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: {
    vista?: string;
    ref?: string;
    sede?: string;
    alumna?: string;
    tipo?: string;
    q?: string;
  };
}) {
  await requireRol(["super_admin", "maestra", "coach_asistente"]);

  const vista: VistaAgenda =
    searchParams.vista && esVista(searchParams.vista)
      ? searchParams.vista
      : "lista";
  const sedeId = searchParams.sede ?? "";
  const inscripcionId = searchParams.alumna ?? "";
  const tipo =
    searchParams.tipo && esTipoEvento(searchParams.tipo)
      ? searchParams.tipo
      : "";
  const q = (searchParams.q ?? "").trim();

  const rango = calcularRango(vista, searchParams.ref);

  const [sedes, alumnas, ocurrencias, conceptos] = await Promise.all([
    listarSedes(),
    listarAlumnasOpciones(),
    listarOcurrenciasRango(rango.desdeUtc, rango.hastaUtc, {
      sedeId: sedeId || undefined,
      inscripcionId: inscripcionId || undefined,
      tipo: tipo || undefined,
      q: q || undefined,
    }),
    listarConceptos(),
  ]);

  // Solo conceptos activos que no son modificadores (%): son los que la maestra
  // etiqueta en una clase/evento como referencia.
  const conceptosClase = conceptos.filter((c) => c.activo && !c.esModificador);

  const activas = ocurrencias.filter((o) => o.estado !== "cancelado");
  const totalClases = activas.filter((o) => o.tipo === "clase").length;
  const totalEventos = activas.length - totalClases;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">Agenda</h1>
          <p className="text-sm text-filo">
            Programa clases, competencias y toma asistencia.
          </p>
        </div>
        <NuevaClase
          sedes={sedes}
          conceptos={conceptosClase}
          fechaInicial={rango.refISO}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard titulo="Clases" valor={totalClases} hint={rango.etiqueta} />
        <KpiCard titulo="Otros eventos" valor={totalEventos} hint="Competencias, exámenes…" />
        <KpiCard titulo="Pistas activas" valor={sedes.length} hint="Sedes configuradas" />
      </div>

      <AgendaToolbar
        vista={vista}
        etiqueta={rango.etiqueta}
        prevISO={rango.prevISO}
        nextISO={rango.nextISO}
        sedeId={sedeId}
        inscripcionId={inscripcionId}
        tipo={tipo}
        q={q}
        sedes={sedes}
        alumnas={alumnas}
      />

      <Card>
        <CardContent className="pt-6">
          {vista === "lista" ? (
            <VistaLista ocurrencias={ocurrencias} />
          ) : vista === "semana" ? (
            <VistaSemana ocurrencias={ocurrencias} refISO={rango.refISO} />
          ) : (
            <VistaMes ocurrencias={ocurrencias} refISO={rango.refISO} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
