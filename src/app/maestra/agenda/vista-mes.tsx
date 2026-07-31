import Link from "next/link";
import type { OcurrenciaAgenda } from "@/types/domain";
import { fechaLocalISO, horaLocal } from "@/lib/agenda-tz";
import { EventoPopup } from "./evento-popup";
import { tipoBadgeVariant } from "./agenda-shared";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Color de punto por variante de tipo (reutiliza tokens del tema).
function puntoColor(o: OcurrenciaAgenda): string {
  switch (tipoBadgeVariant(o.tipo)) {
    case "success":
      return "bg-logro";
    case "secondary":
      return "bg-filo";
    case "outline":
      return "bg-filo/60";
    default:
      return "bg-profundo";
  }
}

export function VistaMes({
  ocurrencias,
  refISO,
}: {
  ocurrencias: OcurrenciaAgenda[];
  refISO: string; // 'YYYY-MM-01' del mes mostrado
}) {
  const [y, m] = refISO.split("-").map(Number);
  const anio = y!;
  const mes = m!; // 1-12

  // Agrupa ocurrencias por día local.
  const porDia = new Map<string, OcurrenciaAgenda[]>();
  for (const o of ocurrencias) {
    const dia = fechaLocalISO(o.inicioUtc, o.timezoneSede);
    const arr = porDia.get(dia) ?? [];
    arr.push(o);
    porDia.set(dia, arr);
  }

  // Construye la matriz del mes empezando en lunes.
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const offsetInicio = (primero.getUTCDay() + 6) % 7; // 0=lunes
  const diasEnMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const total = offsetInicio + diasEnMes;
  const filas = Math.ceil(total / 7);

  const hoyISO = fechaLocalISO(new Date(), "America/Mexico_City");

  const celdas: (string | null)[] = [];
  for (let i = 0; i < filas * 7; i++) {
    const diaNum = i - offsetInicio + 1;
    if (diaNum < 1 || diaNum > diasEnMes) {
      celdas.push(null);
    } else {
      celdas.push(
        `${anio}-${String(mes).padStart(2, "0")}-${String(diaNum).padStart(2, "0")}`,
      );
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[42rem]">
        <div className="grid grid-cols-7 border-b border-filo/15 text-xs font-semibold text-filo">
          {DIAS.map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map((dia, i) => {
            if (!dia) {
              return (
                <div
                  key={i}
                  className="min-h-[6rem] border-b border-r border-filo/10 bg-hielo/40"
                />
              );
            }
            const lista = porDia.get(dia) ?? [];
            const esHoy = dia === hoyISO;
            const num = Number(dia.slice(8, 10));
            return (
              <div
                key={i}
                className="min-h-[6rem] border-b border-r border-filo/10 p-1.5"
              >
                <Link
                  href={`/maestra/agenda?vista=semana&ref=${dia}`}
                  className={
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs " +
                    (esHoy
                      ? "bg-profundo font-semibold text-white"
                      : "text-tinta hover:bg-hielo")
                  }
                >
                  {num}
                </Link>
                <ul className="mt-1 space-y-1">
                  {lista.slice(0, 3).map((o) => (
                    <li key={o.ocurrenciaId}>
                      <EventoPopup
                        ocurrencia={o}
                        className="flex items-center gap-1 rounded px-0.5 text-[11px] text-tinta transition-colors hover:bg-hielo/60"
                      >
                        <span className="flex items-center gap-1 truncate">
                          <span
                            className={
                              "h-1.5 w-1.5 shrink-0 rounded-full " + puntoColor(o)
                            }
                          />
                          <span
                            className={
                              "truncate " +
                              (o.estado === "cancelado"
                                ? "line-through opacity-60"
                                : "")
                            }
                          >
                            {horaLocal(o.inicioUtc, o.timezoneSede)} {o.titulo}
                          </span>
                        </span>
                      </EventoPopup>
                    </li>
                  ))}
                  {lista.length > 3 ? (
                    <li className="text-[11px] text-filo">
                      +{lista.length - 3} más
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
