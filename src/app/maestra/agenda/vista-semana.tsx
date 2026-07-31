import type { OcurrenciaAgenda } from "@/types/domain";
import { fechaLocalISO, horaLocal } from "@/lib/agenda-tz";
import { Badge } from "@/components/ui/badge";
import { ClaseAcciones } from "./clase-acciones";
import { EventoPopup } from "./evento-popup";
import { TIPO_LABEL, tipoBadgeVariant } from "./agenda-shared";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function VistaSemana({
  ocurrencias,
  refISO,
}: {
  ocurrencias: OcurrenciaAgenda[];
  refISO: string; // 'YYYY-MM-DD' del lunes de la semana
}) {
  const [y, m, d] = refISO.split("-").map(Number);
  const lunes = new Date(Date.UTC(y!, (m ?? 1) - 1, d!));

  // 7 días de la semana como ISO local.
  const diasISO: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(lunes);
    dd.setUTCDate(lunes.getUTCDate() + i);
    diasISO.push(
      `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, "0")}-${String(
        dd.getUTCDate(),
      ).padStart(2, "0")}`,
    );
  }

  const porDia = new Map<string, OcurrenciaAgenda[]>();
  for (const o of ocurrencias) {
    const dia = fechaLocalISO(o.inicioUtc, o.timezoneSede);
    const arr = porDia.get(dia) ?? [];
    arr.push(o);
    porDia.set(dia, arr);
  }

  const hoyISO = fechaLocalISO(new Date(), "America/Mexico_City");

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {diasISO.map((dia, i) => {
        const lista = (porDia.get(dia) ?? []).sort((a, b) =>
          a.inicioUtc.localeCompare(b.inicioUtc),
        );
        const esHoy = dia === hoyISO;
        return (
          <div
            key={dia}
            className={
              "rounded-lg border p-3 " +
              (esHoy ? "border-profundo/40 bg-profundo/5" : "border-filo/15")
            }
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-tinta">{DIAS[i]}</span>
              <span className="text-xs text-filo">{Number(dia.slice(8, 10))}</span>
            </div>
            {lista.length === 0 ? (
              <p className="py-2 text-xs text-filo">Sin clases</p>
            ) : (
              <ul className="space-y-2">
                {lista.map((o) => {
                  const cancelada = o.estado === "cancelado";
                  return (
                    <li
                      key={o.ocurrenciaId}
                      className="rounded-md border border-filo/10 bg-white p-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <EventoPopup
                          ocurrencia={o}
                          className="rounded-md transition-colors hover:bg-hielo/60"
                        >
                          <p
                            className={
                              "truncate text-sm font-medium text-tinta " +
                              (cancelada ? "line-through opacity-60" : "")
                            }
                          >
                            {o.titulo}
                          </p>
                          <p className="tabular text-xs text-filo">
                            {horaLocal(o.inicioUtc, o.timezoneSede)}–
                            {horaLocal(o.finUtc, o.timezoneSede)}
                          </p>
                          {o.sedeNombre ? (
                            <p className="truncate text-xs text-filo">
                              {o.sedeNombre}
                            </p>
                          ) : null}
                        </EventoPopup>
                        <Badge variant={tipoBadgeVariant(o.tipo)}>
                          {TIPO_LABEL[o.tipo]}
                        </Badge>
                      </div>
                      <div className="mt-1 flex justify-end">
                        <ClaseAcciones ocurrencia={o} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
