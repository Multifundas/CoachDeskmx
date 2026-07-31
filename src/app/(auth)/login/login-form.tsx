"use client";

import { useFormState, useFormStatus } from "react-dom";
import { enviarMagicLink, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const initialState: LoginState = { error: null, ok: false, email: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Enviando…" : "Enviar enlace de acceso"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(enviarMagicLink, initialState);

  if (state.ok) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-center">
            <p className="font-display text-lg font-semibold text-tinta">
              Revisa tu correo
            </p>
            <p className="text-sm text-filo">
              Enviamos un enlace de acceso a{" "}
              <span className="font-medium text-tinta">{state.email}</span>.
              Ábrelo en este dispositivo para entrar.
            </p>
            <p className="pt-2 text-xs text-filo">
              ¿No llegó? Revisa spam o vuelve a intentarlo en un minuto.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tucorreo@demo.mx"
              defaultValue={state.email ?? ""}
              required
            />
          </div>

          {state.error ? (
            <p className="text-sm text-alerta" role="alert">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-xs text-filo">
          Te enviaremos un enlace mágico por correo. Sin contraseña.
        </p>
      </CardContent>
    </Card>
  );
}
