import "server-only";

// Data layer del feed ICS público. El endpoint es sin sesión (lo consume Google/
// Apple Calendar), así que se usa el service_role para saltar RLS DESPUÉS de
// validar el token_feed. El service_role NUNCA se expone al cliente.
import { createClient } from "@supabase/supabase-js";
import type { EventoICS } from "@/lib/ics";

function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan credenciales de servicio para el feed ICS.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Sin caché de Next: una revocación de token debe surtir efecto de
      // inmediato para el feed público, no servir datos obsoletos.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

/**
 * Resuelve el tenant a partir de un token de feed activo (tipo 'ics'). Devuelve
 * null si el token no existe, está revocado o no es de tipo ICS.
 */
export async function tenantPorTokenFeed(
  token: string,
): Promise<string | null> {
  if (!token) return null;
  const supabase = clienteAdmin();
  const { data } = await supabase
    .from("conexiones_calendario")
    .select("tenant_id")
    .eq("token_feed", token)
    .eq("tipo", "ics")
    .eq("estado", "activa")
    .maybeSingle();
  return data?.tenant_id ?? null;
}

/**
 * Ocurrencias del tenant para el feed: una VEVENT por ocurrencia (materializada
 * en evento_ocurrencias), que es exactamente lo que muestra la agenda. Se emiten
 * las canceladas con STATUS:CANCELLED para que el calendario suscrito las retire.
 *
 * Cada ocurrencia tiene fechas concretas, así que NO se emite RRULE (la
 * recurrencia ya está expandida en filas). El UID es por ocurrencia (uid del
 * evento + su id) para que cancelar una sola clase de una serie no afecte al
 * resto. Una ocurrencia se considera cancelada si su propio estado lo es o si
 * el evento padre está cancelado (serie completa cancelada).
 */
export async function eventosParaFeed(
  tenantId: string,
): Promise<EventoICS[]> {
  const supabase = clienteAdmin();
  const { data } = await supabase
    .from("evento_ocurrencias")
    .select(
      "id, inicio_utc, fin_utc, estado, evento:eventos!inner(uid, titulo, estado, tenant_id)",
    )
    .eq("evento.tenant_id", tenantId)
    .order("inicio_utc", { ascending: true });

  interface Fila {
    id: string;
    inicio_utc: string;
    fin_utc: string;
    estado: string;
    evento: {
      uid: string;
      titulo: string;
      estado: string;
    } | null;
  }

  return ((data ?? []) as unknown as Fila[])
    .filter((o): o is Fila & { evento: NonNullable<Fila["evento"]> } =>
      o.evento !== null,
    )
    .map((o) => ({
      // UID estable y único por ocurrencia: <uid-evento>-<id-ocurrencia>.
      uid: `${o.evento.uid}-${o.id}`,
      seq: 0,
      titulo: o.evento.titulo,
      inicioUtc: o.inicio_utc,
      finUtc: o.fin_utc,
      rrule: null,
      cancelado: o.estado === "cancelado" || o.evento.estado === "cancelado",
    }));
}
