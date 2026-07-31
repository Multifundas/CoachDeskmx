"use server";

// Server Actions de autenticación con Supabase Auth (magic link / OTP por correo).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
  ok: boolean;
  email: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Envía un enlace mágico (magic link) al correo. Supabase manda un correo con
 * un enlace hacia /auth/callback que intercambia el código por una sesión.
 */
export async function enviarMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { error: "Ingresa un correo válido.", ok: false, email };
  }

  const supabase = createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // No crear usuarios desde el login: solo cuentas ya dadas de alta.
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      error:
        "No se pudo enviar el enlace. Verifica el correo e inténtalo de nuevo.",
      ok: false,
      email,
    };
  }

  // Respuesta neutra: no revelamos si el correo existe.
  return { error: null, ok: true, email };
}

export async function logoutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
