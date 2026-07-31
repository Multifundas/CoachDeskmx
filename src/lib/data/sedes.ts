import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SedeAdmin {
  id: string;
  nombre: string;
  timezone: string;
  direccion: string | null;
  activa: boolean;
}

/** Lista todas las sedes (pistas) del tenant, activas e inactivas. RLS filtra. */
export async function listarSedesAdmin(): Promise<SedeAdmin[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("sedes")
    .select("id, nombre, timezone, direccion, activa")
    .order("activa", { ascending: false })
    .order("nombre", { ascending: true });

  interface FilaSede {
    id: string;
    nombre: string;
    timezone: string;
    direccion: string | null;
    activa: boolean;
  }

  const filas = (data ?? []) as FilaSede[];
  return filas.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    timezone: s.timezone,
    direccion: s.direccion,
    activa: s.activa,
  }));
}

/** Zonas horarias comunes en México (para el selector de sede). */
export const TIMEZONES_MX: { value: string; label: string }[] = [
  { value: "America/Mexico_City", label: "Centro (CDMX)" },
  { value: "America/Cancun", label: "Sureste (Cancún)" },
  { value: "America/Monterrey", label: "Monterrey" },
  { value: "America/Chihuahua", label: "Chihuahua" },
  { value: "America/Mazatlan", label: "Pacífico (Mazatlán)" },
  { value: "America/Hermosillo", label: "Sonora (Hermosillo)" },
  { value: "America/Tijuana", label: "Noroeste (Tijuana)" },
];
