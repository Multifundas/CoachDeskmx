// Página pública tokenizada: muestra el desempeño de una alumna (camino a su
// próximo nivel + tareas pendientes) de solo lectura a partir de un token
// compartido (p. ej. por WhatsApp). Sin sesión: la resolución valida el token
// con service_role y devuelve un shape mínimo y seguro.
import { notFound } from "next/navigation";
import {
  resolverDesempenoPublico,
  type EstadoElementoPublico,
} from "@/lib/data/tokens-publicos";
import { fechaDia } from "@/lib/fecha";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<EstadoElementoPublico, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  dominado: "Dominado",
};

const ESTADO_CLASS: Record<EstadoElementoPublico, string> = {
  pendiente: "bg-filo/10 text-filo",
  en_progreso: "bg-profundo/10 text-profundo",
  dominado: "bg-logro/15 text-logro",
};

export default async function TokenDesempenoPage({
  params,
}: {
  params: { token: string };
}) {
  const des = await resolverDesempenoPublico(params.token);
  if (!des) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-filo">
          {des.proximoNivel ? `Camino a ${des.proximoNivel}` : "Desempeño"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-tinta">
          {des.alumna}
        </h1>
      </header>

      {des.proximoNivel ? (
        <section className="mb-6 space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-tinta">Progreso</span>
              <span className="text-filo">{des.progresoPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-filo/15">
              <div
                className="h-full rounded-full bg-logro transition-all"
                style={{ width: `${des.progresoPct}%` }}
              />
            </div>
          </div>

          {des.elementos.length === 0 ? (
            <p className="rounded-lg border border-filo/20 px-4 py-6 text-center text-sm text-filo">
              Aún no hay elementos registrados para este nivel.
            </p>
          ) : (
            <ul className="divide-y divide-filo/10 overflow-hidden rounded-lg border border-filo/20">
              {des.elementos.map((e, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="text-sm text-tinta">{e.descripcion}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASS[e.estado]}`}
                  >
                    {ESTADO_LABEL[e.estado]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="mb-6 rounded-lg border border-filo/20 px-4 py-6 text-center text-sm text-filo">
          Sin nivel siguiente por ahora.
        </p>
      )}

      {des.tareas.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-tinta">Tareas para la mamá</h2>
          <ul className="divide-y divide-filo/10 overflow-hidden rounded-lg border border-filo/20">
            {des.tareas.map((t, idx) => (
              <li key={idx} className="px-4 py-3">
                <p className="text-sm text-tinta">{t.titulo}</p>
                {t.fechaLimite ? (
                  <p className="mt-0.5 text-xs text-filo">
                    Para el {fechaDia(t.fechaLimite)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 text-center text-xs text-filo">
        Desempeño compartido por tu maestra. Solo lectura.
      </p>
    </main>
  );
}
