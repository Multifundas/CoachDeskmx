import { requireRol } from "@/lib/auth/guard";
import { listarSedesAdmin } from "@/lib/data/sedes";
import { listarTarifasNivel } from "@/lib/data/competencias";
import { listarSedeTarifas } from "@/lib/data/sede-tarifas";
import { listarConceptos } from "@/lib/data/conceptos";
import { obtenerAsistenciaDefault } from "@/lib/data/tenant-config";
import { obtenerFeedICS } from "@/lib/data/calendario";
import { listarBloques } from "@/lib/data/bloques";
import { fechaDia } from "@/lib/fecha";
import { Badge } from "@/components/ui/badge";
import { SelectorApariencia } from "./apariencia";
import { AgregarSede, EditarSede } from "./sede-form";
import { CuotasNivelForm } from "./cuotas-nivel";
import { TarifasSedeForm } from "./tarifas-sede";
import { ConceptosForm } from "./conceptos-form";
import { AsistenciaDefaultForm } from "./asistencia-form";
import { CalendarioFeedForm } from "./calendario-form";
import { AgregarHorario, EditarHorario, DIAS_SEMANA } from "./horario-form";
import { SeccionColapsable } from "./seccion-colapsable";

export default async function AjustesPage() {
  const sesion = await requireRol(["super_admin", "maestra"]);
  const [
    sedes,
    tarifas,
    sedeTarifas,
    conceptos,
    asistenciaDefault,
    feedICS,
    bloques,
  ] = await Promise.all([
    listarSedesAdmin(),
    listarTarifasNivel(),
    listarSedeTarifas(),
    listarConceptos(),
    obtenerAsistenciaDefault(),
    obtenerFeedICS(),
    listarBloques(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">Ajustes</h1>
        <p className="text-sm text-filo">
          Personaliza tu panel y configura tu escuela.
        </p>
      </div>

      {/* Apariencia */}
      <SeccionColapsable
        titulo="Apariencia"
        descripcion="Elige la paleta de color de tu panel. El cambio es solo para ti."
        icono="Palette"
      >
        <SelectorApariencia temaActual={sesion.tema} />
      </SeccionColapsable>

      {/* Pistas (sedes) */}
      <SeccionColapsable
        titulo="Pistas"
        descripcion="Sedes donde impartes clases. Se usan en la Agenda."
        icono="MapPin"
        accion={<AgregarSede />}
      >
        {sedes.length === 0 ? (
          <p className="py-6 text-center text-sm text-filo">
            Aún no tienes pistas. Agrega la primera para usarla en tu agenda.
          </p>
        ) : (
          <ul className="divide-y divide-filo/10">
            {sedes.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-tinta">
                    {s.nombre}
                    {!s.activa ? (
                      <Badge variant="outline">Archivada</Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-filo">
                    {s.timezone}
                    {s.direccion ? ` · ${s.direccion}` : ""}
                  </p>
                </div>
                <EditarSede sede={s} />
              </li>
            ))}
          </ul>
        )}
      </SeccionColapsable>

      {/* Cuotas de competencia por nivel */}
      <SeccionColapsable
        titulo="Cuotas de competencia por nivel"
        descripcion="Cuota de coacheo que se cobra al inscribir una alumna a una competencia, según su nivel. Montos en MXN."
        icono="Trophy"
      >
        <CuotasNivelForm tarifas={tarifas} />
      </SeccionColapsable>

      {/* Precios por sede (costo/hora por tier + modificadores) */}
      <SeccionColapsable
        titulo="Precios por sede"
        descripcion="Costo por hora según el tipo de pista (Base / Externa A / Externa B) y ajustes por horario matutino/nocturno. Se usan para cobrar las clases confirmadas. Montos en MXN."
        icono="DollarSign"
      >
        <TarifasSedeForm sedes={sedeTarifas} />
      </SeccionColapsable>

      {/* Conceptos y precios */}
      <SeccionColapsable
        titulo="Conceptos y precios"
        descripcion="Catálogo de conceptos para cargos y pagos (peinado, renta de hielo, etc.). Montos en MXN."
        icono="Tag"
      >
        <ConceptosForm conceptos={conceptos} />
      </SeccionColapsable>

      {/* Asistencia por defecto */}
      <SeccionColapsable
        titulo="Asistencia"
        descripcion="Cómo se toma la asistencia por defecto al abrir una clase: requerir confirmación o pre-marcar a todas presentes."
        icono="CheckSquare"
      >
        <AsistenciaDefaultForm modoActual={asistenciaDefault} />
      </SeccionColapsable>

      {/* Calendario externo (feed ICS Google/Apple) */}
      <SeccionColapsable
        titulo="Calendario externo (Google/Apple)"
        descripcion="Suscríbete a tu agenda desde Google Calendar o Apple Calendar con un enlace de solo lectura."
        icono="CalendarClock"
      >
        <CalendarioFeedForm feed={feedICS} />
      </SeccionColapsable>

      {/* Horarios (bloques de hielo recurrentes/puntuales) */}
      <SeccionColapsable
        titulo="Horarios"
        descripcion="Bloques de hielo contratados por pista, recurrentes por día de semana o para una fecha específica."
        icono="Clock"
        accion={<AgregarHorario sedes={sedes} />}
      >
        {sedes.length === 0 ? (
          <p className="py-6 text-center text-sm text-filo">
            Primero agrega una pista para poder definir sus horarios.
          </p>
        ) : bloques.length === 0 ? (
          <p className="py-6 text-center text-sm text-filo">
            Aún no tienes horarios. Agrega el primer bloque de hielo.
          </p>
        ) : (
          <ul className="divide-y divide-filo/10">
            {bloques.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-tinta">
                    {b.diaSemana != null
                      ? DIAS_SEMANA[b.diaSemana]
                      : fechaDia(b.fecha)}{" "}
                    {b.horaInicio}–{b.horaFin}
                  </p>
                  <p className="text-xs text-filo">
                    {b.sedeNombre}
                    {b.capacidad != null ? ` · cap. ${b.capacidad}` : ""}
                    {b.diaSemana != null ? " · cada semana" : ""}
                  </p>
                </div>
                <EditarHorario bloque={b} sedes={sedes} />
              </li>
            ))}
          </ul>
        )}
      </SeccionColapsable>
    </div>
  );
}
