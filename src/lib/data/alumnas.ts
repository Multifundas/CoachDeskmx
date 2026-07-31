import "server-only";

import type {
  EstadoInscripcion,
  Parentesco,
  SexoPersona,
} from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

// Vista de alumna para la gestión (lista + edición). Ficha completa privada por
// maestra (RLS). Incluye contacto de la alumna, responsable y emergencia.
export interface AlumnaAdmin {
  inscripcionId: string;
  personaId: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string | null;
  nivelActualId: string | null;
  nivelActual: string | null;
  estado: EstadoInscripcion;
  fechaAlta: string;
  fechaBaja: string | null;
  notasPrivadas: string | null;
  saldoMxn: number;
  // Ficha ampliada (privada por maestra).
  telefonoAlumna: string | null;
  sexo: SexoPersona | null;
  club: string | null;
  tutorNombre: string | null;
  tutorTelefono: string | null;
  tutorEmail: string | null;
  tutorParentesco: Parentesco | null;
  emergenciaNombre: string | null;
  emergenciaTelefono: string | null;
  notasMedicas: string | null;
  // Estado del vínculo de login (solo poblado en la ficha de detalle).
  alumnaAppUserId: string | null; // cuenta de la propia alumna (personas.app_user_id)
  tutorAppUserId: string | null; // cuenta del tutor principal (tutores.app_user_id)
}

// Nivel del catálogo FEMEPASHIDI para poblar el selector.
export interface NivelOpcion {
  id: string;
  nombre: string;
  rama: string;
}

interface FilaCargo {
  monto: number | string;
  inscripcion_id: string;
}

interface FilaAlumna {
  id: string;
  estado: EstadoInscripcion;
  fecha_alta: string;
  fecha_baja: string | null;
  notas_privadas: string | null;
  telefono_alumna: string | null;
  sexo: SexoPersona | null;
  club: string | null;
  tutor_nombre: string | null;
  tutor_telefono: string | null;
  tutor_email: string | null;
  tutor_parentesco: Parentesco | null;
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  notas_medicas: string | null;
  persona: {
    id: string;
    nombre: string;
    apellidos: string;
    fecha_nacimiento: string | null;
    nivel_actual_id: string | null;
    app_user_id: string | null;
    nivel: { nombre: string } | null;
  } | null;
}

export async function listarAlumnas(): Promise<AlumnaAdmin[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("inscripciones")
    .select(
      "id, estado, fecha_alta, fecha_baja, notas_privadas, telefono_alumna, sexo, club, tutor_nombre, tutor_telefono, tutor_email, tutor_parentesco, emergencia_nombre, emergencia_telefono, notas_medicas, persona:personas(id, nombre, apellidos, fecha_nacimiento, nivel_actual_id, nivel:niveles(nombre))",
    )
    .order("fecha_alta", { ascending: true });

  const filas = (data ?? []) as unknown as FilaAlumna[];

  // Saldo por inscripción a partir de cargos abiertos.
  const { data: cargosData } = await supabase
    .from("cargos")
    .select("monto, inscripcion_id")
    .in("estado", ["pendiente", "parcial", "en_corte"]);
  const cargos = (cargosData ?? []) as FilaCargo[];
  const saldos = new Map<string, number>();
  for (const c of cargos) {
    saldos.set(c.inscripcion_id, (saldos.get(c.inscripcion_id) ?? 0) + Number(c.monto));
  }

  return filas
    .filter((f): f is FilaAlumna & { persona: NonNullable<FilaAlumna["persona"]> } =>
      f.persona !== null,
    )
    .map((f) => ({
      inscripcionId: f.id,
      personaId: f.persona.id,
      nombre: f.persona.nombre,
      apellidos: f.persona.apellidos,
      fechaNacimiento: f.persona.fecha_nacimiento,
      nivelActualId: f.persona.nivel_actual_id,
      nivelActual: f.persona.nivel?.nombre ?? null,
      estado: f.estado,
      fechaAlta: f.fecha_alta,
      fechaBaja: f.fecha_baja,
      notasPrivadas: f.notas_privadas,
      saldoMxn: saldos.get(f.id) ?? 0,
      telefonoAlumna: f.telefono_alumna,
      sexo: f.sexo,
      club: f.club,
      tutorNombre: f.tutor_nombre,
      tutorTelefono: f.tutor_telefono,
      tutorEmail: f.tutor_email,
      tutorParentesco: f.tutor_parentesco,
      emergenciaNombre: f.emergencia_nombre,
      emergenciaTelefono: f.emergencia_telefono,
      notasMedicas: f.notas_medicas,
      alumnaAppUserId: null, // no relevante en la lista
      tutorAppUserId: null,
    }));
}

// Ficha completa de una sola inscripción (para la vista de detalle). RLS
// garantiza que solo se devuelva si pertenece al tenant de la sesión.
export async function obtenerAlumna(inscripcionId: string): Promise<AlumnaAdmin | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("inscripciones")
    .select(
      "id, estado, fecha_alta, fecha_baja, notas_privadas, telefono_alumna, sexo, club, tutor_nombre, tutor_telefono, tutor_email, tutor_parentesco, emergencia_nombre, emergencia_telefono, notas_medicas, persona:personas(id, nombre, apellidos, fecha_nacimiento, nivel_actual_id, app_user_id, nivel:niveles(nombre))",
    )
    .eq("id", inscripcionId)
    .maybeSingle();

  const f = data as unknown as FilaAlumna | null;
  if (!f || !f.persona) return null;

  const { data: cargosData } = await supabase
    .from("cargos")
    .select("monto, inscripcion_id")
    .eq("inscripcion_id", f.id)
    .in("estado", ["pendiente", "parcial", "en_corte"]);
  const saldoMxn = (cargosData ?? []).reduce(
    (s, c) => s + Number((c as FilaCargo).monto),
    0,
  );

  // Cuenta del tutor principal (vía persona_tutor → tutores). El vínculo permite
  // dar acceso al tutor a la agenda/estado de cuenta de la alumna.
  const { data: tutorData } = await supabase
    .from("persona_tutor")
    .select("es_contacto_principal, tutor:tutores(app_user_id)")
    .eq("persona_id", f.persona.id);
  const vinculos = (tutorData ?? []) as unknown as {
    es_contacto_principal: boolean;
    tutor: { app_user_id: string | null } | null;
  }[];
  const principal =
    vinculos.find((v) => v.es_contacto_principal) ?? vinculos[0];
  const tutorAppUserId = principal?.tutor?.app_user_id ?? null;

  return {
    inscripcionId: f.id,
    personaId: f.persona.id,
    nombre: f.persona.nombre,
    apellidos: f.persona.apellidos,
    fechaNacimiento: f.persona.fecha_nacimiento,
    nivelActualId: f.persona.nivel_actual_id,
    nivelActual: f.persona.nivel?.nombre ?? null,
    estado: f.estado,
    fechaAlta: f.fecha_alta,
    fechaBaja: f.fecha_baja,
    notasPrivadas: f.notas_privadas,
    saldoMxn,
    telefonoAlumna: f.telefono_alumna,
    sexo: f.sexo,
    club: f.club,
    tutorNombre: f.tutor_nombre,
    tutorTelefono: f.tutor_telefono,
    tutorEmail: f.tutor_email,
    tutorParentesco: f.tutor_parentesco,
    emergenciaNombre: f.emergencia_nombre,
    emergenciaTelefono: f.emergencia_telefono,
    notasMedicas: f.notas_medicas,
    alumnaAppUserId: f.persona.app_user_id,
    tutorAppUserId,
  };
}

export async function listarNiveles(): Promise<NivelOpcion[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("niveles")
    .select("id, nombre, rama, orden")
    .order("rama", { ascending: true })
    .order("orden", { ascending: true });

  interface FilaNivel {
    id: string;
    nombre: string;
    rama: string;
  }

  const filas = (data ?? []) as FilaNivel[];
  return filas.map((n) => ({ id: n.id, nombre: n.nombre, rama: n.rama }));
}
