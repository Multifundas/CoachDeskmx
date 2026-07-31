"use server";

// Acciones para vincular una cuenta de acceso (login) a una ALUMNA o a su TUTOR.
// La maestra invita por email: se crea el usuario en Supabase Auth, su fila en
// app_users, se liga a la persona/tutor y se le da una membership del tenant con
// el rol correspondiente (alumna/tutor). El aislamiento posterior lo aplica RLS
// (personas.app_user_id / tutores.app_user_id).
//
// Requiere service_role porque crea usuarios de Auth y escribe memberships de un
// tenant en nombre de la maestra. La autorización se valida ANTES: la sesión debe
// ser de un coach cuyo tenant sea el de la inscripción.
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface VinculoState {
  error: string | null;
  ok: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan credenciales de servicio para el vínculo de login.");
  }
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function limpiar(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Asegura que exista un usuario de Auth para el email dado y devuelve su id.
 * Invita por email si no existe (envía correo de acceso). Si el email ya está
 * registrado, reutiliza el usuario existente. Crea/actualiza la fila app_users.
 */
async function asegurarUsuario(
  admin: ReturnType<typeof clienteAdmin>,
  email: string,
  nombre: string,
): Promise<{ id: string } | { error: string }> {
  // Invitar por email. Si ya existe, Supabase devuelve un error específico y
  // caemos a la búsqueda del usuario existente.
  const invit = await admin.auth.admin.inviteUserByEmail(email);

  let userId: string | null = invit.data?.user?.id ?? null;

  if (invit.error) {
    // El usuario podría existir ya. Buscarlo por email en la lista de Auth.
    const { data: lista, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) {
      return { error: "No se pudo invitar ni localizar al usuario." };
    }
    const existente = lista.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (!existente) {
      return { error: "No se pudo enviar la invitación por email." };
    }
    userId = existente.id;
  }

  if (!userId) return { error: "No se pudo resolver la cuenta del usuario." };

  // Fila en app_users (no hay trigger automático). Upsert por id.
  const { error: upErr } = await admin.from("app_users").upsert(
    { id: userId, email, nombre: nombre || "" },
    { onConflict: "id" },
  );
  if (upErr) {
    return { error: "No se pudo registrar el perfil de la cuenta." };
  }

  return { id: userId };
}

/**
 * Da acceso a la ALUMNA: invita su email, liga personas.app_user_id y crea una
 * membership de rol 'alumna' en el tenant. Idempotente.
 */
export async function vincularAlumnaLogin(
  _prev: VinculoState,
  formData: FormData,
): Promise<VinculoState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;

  const inscripcionId = limpiar(formData, "inscripcion_id");
  const email = limpiar(formData, "email").toLowerCase();
  const nombre = limpiar(formData, "nombre");

  if (!inscripcionId) return { error: "Alumna no encontrada.", ok: false };
  if (!EMAIL_RE.test(email)) {
    return { error: "Escribe un email válido.", ok: false };
  }

  // Autorización: la inscripción debe ser del tenant de la sesión (RLS del
  // cliente de sesión lo confirma) y obtenemos la persona.
  const supabase = createClient();
  const { data: insc } = await supabase
    .from("inscripciones")
    .select("id, persona_id")
    .eq("id", inscripcionId)
    .maybeSingle();
  if (!insc) return { error: "Alumna no encontrada.", ok: false };

  const personaId = (insc as { persona_id: string }).persona_id;
  const admin = clienteAdmin();

  const usuario = await asegurarUsuario(admin, email, nombre);
  if ("error" in usuario) return { error: usuario.error, ok: false };

  // Ligar la persona a la cuenta.
  const { error: pErr } = await admin
    .from("personas")
    .update({ app_user_id: usuario.id })
    .eq("id", personaId);
  if (pErr) {
    return { error: "No se pudo ligar la cuenta a la alumna.", ok: false };
  }

  // Membership de rol alumna (idempotente por unique(tenant_id, app_user_id, rol)).
  const { error: mErr } = await admin.from("memberships").upsert(
    { tenant_id: tenantId, app_user_id: usuario.id, rol: "alumna", activo: true },
    { onConflict: "tenant_id,app_user_id,rol" },
  );
  if (mErr) {
    return { error: "No se pudo asignar el acceso de la alumna.", ok: false };
  }

  revalidatePath("/maestra/alumnas");
  return { error: null, ok: true };
}

/**
 * Da acceso al TUTOR principal de la alumna: invita su email, liga
 * tutores.app_user_id y crea una membership de rol 'tutor' en el tenant. Si la
 * alumna no tiene un tutor registrado, crea uno con el nombre/email dados.
 */
export async function vincularTutorLogin(
  _prev: VinculoState,
  formData: FormData,
): Promise<VinculoState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;

  const inscripcionId = limpiar(formData, "inscripcion_id");
  const email = limpiar(formData, "email").toLowerCase();
  const nombre = limpiar(formData, "nombre");

  if (!inscripcionId) return { error: "Alumna no encontrada.", ok: false };
  if (!EMAIL_RE.test(email)) {
    return { error: "Escribe un email válido.", ok: false };
  }

  const supabase = createClient();
  const { data: insc } = await supabase
    .from("inscripciones")
    .select("id, persona_id")
    .eq("id", inscripcionId)
    .maybeSingle();
  if (!insc) return { error: "Alumna no encontrada.", ok: false };

  const personaId = (insc as { persona_id: string }).persona_id;
  const admin = clienteAdmin();

  const usuario = await asegurarUsuario(admin, email, nombre);
  if ("error" in usuario) return { error: usuario.error, ok: false };

  // Localizar el tutor principal de la persona; si no hay, crear uno.
  const { data: vinculos } = await admin
    .from("persona_tutor")
    .select("tutor_id, es_contacto_principal")
    .eq("persona_id", personaId);

  const filas = (vinculos ?? []) as {
    tutor_id: string;
    es_contacto_principal: boolean;
  }[];
  const principal = filas.find((v) => v.es_contacto_principal) ?? filas[0];

  let tutorId = principal?.tutor_id ?? null;

  if (!tutorId) {
    // Crear tutor y su vínculo con la persona.
    const { data: nuevoTutor, error: tErr } = await admin
      .from("tutores")
      .insert({ nombre: nombre || email, email, app_user_id: usuario.id })
      .select("id")
      .single();
    if (tErr || !nuevoTutor) {
      return { error: "No se pudo crear el tutor.", ok: false };
    }
    tutorId = (nuevoTutor as { id: string }).id;

    const { error: ptErr } = await admin.from("persona_tutor").upsert(
      {
        persona_id: personaId,
        tutor_id: tutorId,
        es_contacto_principal: true,
      },
      { onConflict: "persona_id,tutor_id" },
    );
    if (ptErr) {
      return { error: "No se pudo ligar el tutor a la alumna.", ok: false };
    }
  } else {
    // Ligar la cuenta al tutor existente.
    const { error: tuErr } = await admin
      .from("tutores")
      .update({ app_user_id: usuario.id })
      .eq("id", tutorId);
    if (tuErr) {
      return { error: "No se pudo ligar la cuenta al tutor.", ok: false };
    }
  }

  // Membership de rol tutor (idempotente).
  const { error: mErr } = await admin.from("memberships").upsert(
    { tenant_id: tenantId, app_user_id: usuario.id, rol: "tutor", activo: true },
    { onConflict: "tenant_id,app_user_id,rol" },
  );
  if (mErr) {
    return { error: "No se pudo asignar el acceso del tutor.", ok: false };
  }

  revalidatePath("/maestra/alumnas");
  return { error: null, ok: true };
}
