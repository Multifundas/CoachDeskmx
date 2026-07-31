"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  enviarMagicLink,
  iniciarConPassword,
  type LoginState,
} from "@/lib/auth/actions";
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

function PasswordButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Entrando…" : "Entrar con contraseña"}
    </Button>
  );
}

function PasswordForm() {
  const [state, formAction] = useFormState(iniciarConPassword, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-pwd">Correo</Label>
        <Input
          id="email-pwd"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tucorreo@demo.mx"
          defaultValue={state.email ?? ""}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      ) : null}
      <PasswordButton />
    </form>
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

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-filo/20" />
          <span className="text-xs uppercase tracking-wide text-filo">o</span>
          <div className="h-px flex-1 bg-filo/20" />
        </div>

        <PasswordForm />
      </CardContent>
    </Card>
  );
}
