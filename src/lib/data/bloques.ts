import "server-only";

// Data layer de bloques de hielo (horarios recurrentes/puntuales por sede). Un
// bloque es una franja contratada: recurrente por día de semana (dia_semana) o
// puntual por fecha. RLS filtra por tenant (is_member).
import { createClient } from "@/lib/supabase/server";

export interface BloqueFila {
  id: string;
  sedeId: string;
  sedeNombre: string;
  diaSemana: number | null; // 0=domingo … 6=sábado; null si es puntual
  fecha: string | null; // ISO date; null si es recurrente
  horaInicio: string; // 'HH:MM' (recortado de time 'HH:MM:SS')
  horaFin: string;
  capacidad: number | null;
}

// Recorta un time 'HH:MM:SS' a 'HH:MM' para mostrar.
function hhmm(t: string): string {
  return t.slice(0, 5);
}

export async function listarBloques(): Promise<BloqueFila[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("bloques_hielo")
    .select(
      "id, sede_id, dia_semana, fecha, hora_inicio, hora_fin, capacidad, sede:sedes(nombre)",
    )
    .order("sede_id", { ascending: true })
    .order("dia_semana", { ascending: true, nullsFirst: false })
    .order("hora_inicio", { ascending: true });

  interface Fila {
    id: string;
    sede_id: string;
    dia_semana: number | null;
    fecha: string | null;
    hora_inicio: string;
    hora_fin: string;
    capacidad: number | null;
    sede: { nombre: string } | null;
  }

  const filas = (data ?? []) as unknown as Fila[];
  return filas.map((b) => ({
    id: b.id,
    sedeId: b.sede_id,
    sedeNombre: b.sede?.nombre ?? "(sin pista)",
    diaSemana: b.dia_semana,
    fecha: b.fecha,
    horaInicio: hhmm(b.hora_inicio),
    horaFin: hhmm(b.hora_fin),
    capacidad: b.capacidad,
  }));
}
