import { redirect } from "next/navigation";
import { getSesion, rutaInicioPorRol } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Si ya hay sesión, redirige al panel por rol.
  const sesion = await getSesion();
  if (sesion) redirect(rutaInicioPorRol(sesion.rol));

  return (
    <main className="flex min-h-screen items-center justify-center bg-hielo p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold text-tinta">
            CoachDeskmx
          </h1>
          <p className="mt-1 text-sm text-filo">
            Ingresa a tu panel de patinaje.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
