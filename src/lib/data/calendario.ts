import "server-only";

// Data layer del token de feed ICS visible para la maestra (Ajustes). Lee la
// conexión 'ics' activa del tenant de sesión (RLS la limita a is_member).
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface FeedICS {
  token: string;
  url: string;
}

/**
 * Token de feed ICS activo del tenant, o null si no hay uno generado. Construye
 * la URL de suscripción con NEXT_PUBLIC_APP_URL.
 */
export async function obtenerFeedICS(): Promise<FeedICS | null> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("conexiones_calendario")
    .select("token_feed")
    .eq("tipo", "ics")
    .eq("estado", "activa")
    .not("token_feed", "is", null)
    .maybeSingle();

  const token = data?.token_feed;
  if (!token) return null;

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  return {
    token,
    url: `${base}/api/calendario/feed?token=${token}`,
  };
}
