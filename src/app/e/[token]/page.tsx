// Página pública tokenizada: muestra un estado de cuenta de solo lectura a partir
// de un token compartido (p. ej. por WhatsApp). Sin sesión: la resolución valida
// el token con service_role y devuelve un shape mínimo y seguro.
import { notFound } from "next/navigation";
import { resolverEstadoCuentaPublico } from "@/lib/data/tokens-publicos";
import { formatMXN } from "@/lib/money";
import { formatEnSede } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function TokenPublicPage({
  params,
}: {
  params: { token: string };
}) {
  const edc = await resolverEstadoCuentaPublico(params.token);
  if (!edc) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-filo">
          Estado de cuenta
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-tinta">
          {edc.alumna}
        </h1>
        <p className="mt-1 text-sm text-filo">
          Folio {edc.folio} · Periodo {edc.periodo}
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-filo/20">
        <table className="w-full text-sm">
          <thead className="bg-hielo/60 text-left text-filo">
            <tr>
              <th className="px-4 py-2 font-medium">Concepto</th>
              <th className="px-4 py-2 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-filo/10">
            {edc.cargos.map((c, i) => (
              <tr key={i}>
                <td className="px-4 py-2 align-top text-tinta">
                  <span className="font-medium">{c.concepto}</span>
                  {c.fechaUtc || c.ubicacion ? (
                    <span className="mt-0.5 block text-xs text-filo">
                      {c.fechaUtc
                        ? formatEnSede(c.fechaUtc, c.timezone ?? undefined)
                        : null}
                      {c.fechaUtc && c.ubicacion ? " · " : null}
                      {c.ubicacion ?? null}
                    </span>
                  ) : null}
                </td>
                <td className="money px-4 py-2 text-right align-top text-tinta">
                  {formatMXN(c.monto)}
                </td>
              </tr>
            ))}
            <tr className="bg-hielo/40">
              <td className="px-4 py-2 text-right font-medium text-tinta">
                Total
              </td>
              <td className="money px-4 py-2 text-right font-bold text-tinta">
                {formatMXN(edc.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-center text-xs text-filo">
        Documento compartido por tu maestra. Solo lectura.
      </p>
    </main>
  );
}
