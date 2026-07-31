// Cliente de navegador para Supabase (componentes cliente).
// Fase 1: placeholder. Las llamadas se habilitan al conectar un proyecto real.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
