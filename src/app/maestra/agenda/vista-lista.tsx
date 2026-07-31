import type { OcurrenciaAgenda } from "@/types/domain";
import { fechaLocalISO, horaLocal } from "@/lib/agenda-tz";
import { Badge } from "@/components/ui/badge";
import { ClaseAcciones } from "./clase-acciones";
import { EventoPopup } from "./evento-popup";
import { TIPO_LABEL, tipoBadgeVariant } from "./agenda-shared";

// Etiqueta legible de una fecha ISO 'YYYY-MM-DD'.
function tituloDia(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(Date.UTC(y!, (m ?? 1) - 1, d!, 12));
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fecha);
}

export function VistaLista({
  ocurrencias,
}: {
  ocurrencias: OcurrenciaAgenda[];
}) {
  if (ocurrencias.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-filo">
        No hay clases en este periodo. Usa “Nueva clase” para agendar.
      </p>
    );
  }

  // Agrupa por día local (según la TZ de cada ocurrencia).
  const grupos = new Map<string, OcurrenciaAgenda[]>();
  for (const o of ocurrencias) {
    const dia = fechaLocalISO(o.inicioUtc, o.timezoneSede);
    const arr = grupos.get(dia) ?? [];
    arr.push(o);
    grupos.set(dia, arr);
  }
  const dias = [...grupos.keys()].sort();

  return (
    <div className="space-y-6">
      {dias.map((dia) => (
        <div key={dia} className="space-y-2">
          <h3 className="text-sm font-semibold capitalize text-tinta">
            {tituloDia(dia)}
          </h3>
          <ul className="divide-y divide-filo/10 rounded-lg border border-filo/15">
            {grupos.get(dia)!.map((o) => {
              const cancelada = o.estado === "cancelado";
              return (
                <li
                  key={o.ocurrenciaId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <EventoPopup
                    ocurrencia={o}
                    className="rounded-md transition-colors hover:bg-hielo/60"
                  >
                    <p className="flex items-center gap-2 font-medium text-tinta">
                      <span className={cancelada ? "line-through opacity-60" : ""}>
                        {o.titulo}
                      </span>
                      <Badge variant={tipoBadgeVariant(o.tipo)}>
                        {TIPO_LABEL[o.tipo]}
                      </Badge>
                      {o.esSerie ? (
                        <Badge variant="outline">Serie</Badge>
                      ) : null}
                      {cancelada ? (
                        <Badge variant="outline">Cancelada</Badge>
                      ) : null}
                    </p>
                    <p className="tabular text-xs text-filo">
                      {horaLocal(o.inicioUtc, o.timezoneSede)}–
                      {horaLocal(o.finUtc, o.timezoneSede)}
                      {o.sedeNombre ? ` · ${o.sedeNombre}` : ""}
                    </p>
                  </EventoPopup>
                  <ClaseAcciones ocurrencia={o} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
