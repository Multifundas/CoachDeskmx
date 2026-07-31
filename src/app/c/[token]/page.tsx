// Página pública tokenizada: muestra el calendario de próximas clases de una alumna
// de solo lectura a partir de un token compartido (p. ej. por WhatsApp). Sin sesión:
// la resolución valida el token con service_role y devuelve un shape mínimo y seguro.
import { notFound } from "next/navigation";
import { resolverCalendarioPublico } from "@/lib/data/tokens-publicos";
import { formatEnSede } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function TokenCalendarioPage({
  params,
}: {
  params: { token: string };
}) {
  const cal = await resolverCalendarioPublico(params.token);
  if (!cal) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-filo">
          Próximas clases
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-tinta">
          {cal.alumna}
        </h1>
      </header>

      {cal.clases.length === 0 ? (
        <p className="rounded-lg border border-filo/20 px-4 py-8 text-center text-sm text-filo">
          No hay clases próximas.
        </p>
      ) : (
        <ul className="divide-y divide-filo/10 overflow-hidden rounded-lg border border-filo/20">
          {cal.clases.map((c, i) => (
            <li key={i} className="px-4 py-3">
              <p className="font-medium text-tinta">{c.titulo}</p>
              <p className="mt-1 text-sm text-filo">
                {formatEnSede(c.inicioUtc, c.timezone)}
                {c.sede ? ` · ${c.sede}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-xs text-filo">
        Calendario compartido por tu maestra. Solo lectura.
      </p>
    </main>
  );
}
