"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check, Mail } from "lucide-react";
import {
  vincularAlumnaLogin,
  vincularTutorLogin,
  type VinculoState,
} from "@/lib/data/login-vinculo-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const initialState: VinculoState = { error: null, ok: false };

function InvitarButton({ pendingLabel }: { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      <Mail className="h-4 w-4" />
      {pending ? pendingLabel : "Invitar"}
    </Button>
  );
}

function EstadoVinculo({ vinculado }: { vinculado: boolean }) {
  return vinculado ? (
    <Badge variant="success">
      <Check className="h-3 w-3" />
      Con acceso
    </Badge>
  ) : (
    <Badge variant="secondary">Sin acceso</Badge>
  );
}

/**
 * Da acceso a la app a la alumna y/o a su tutor. La maestra invita por email:
 * se crea la cuenta y se liga a la persona/tutor con su rol. Muestra el estado
 * del vínculo actual desde alumnaAppUserId / tutorAppUserId.
 */
export function VincularLogin({
  inscripcionId,
  emailTutor,
  alumnaVinculada,
  tutorVinculado,
}: {
  inscripcionId: string;
  emailTutor: string | null;
  alumnaVinculada: boolean;
  tutorVinculado: boolean;
}) {
  const [estadoAlumna, accionAlumna] = useFormState(
    vincularAlumnaLogin,
    initialState,
  );
  const [estadoTutor, accionTutor] = useFormState(
    vincularTutorLogin,
    initialState,
  );

  return (
    <div className="space-y-4 rounded-lg border border-filo/20 p-3">
      <p className="text-xs text-filo">
        Da acceso a la app invitando por email. Se enviará un correo para
        establecer la contraseña.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-tinta">Alumna</span>
          <EstadoVinculo vinculado={alumnaVinculada} />
        </div>
        {!alumnaVinculada ? (
          <form action={accionAlumna} className="space-y-2">
            <input type="hidden" name="inscripcion_id" value={inscripcionId} />
            <div className="flex items-center gap-2">
              <input
                type="email"
                name="email"
                required
                placeholder="email@ejemplo.com"
                className="flex h-9 w-full rounded-md border border-filo/40 bg-white px-3 text-sm text-tinta"
              />
              <InvitarButton pendingLabel="Invitando…" />
            </div>
            {estadoAlumna.error ? (
              <p className="text-sm text-alerta" role="alert">
                {estadoAlumna.error}
              </p>
            ) : null}
            {estadoAlumna.ok ? (
              <p className="text-sm text-logro">Invitación enviada.</p>
            ) : null}
          </form>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-filo/15 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-tinta">Tutor</span>
          <EstadoVinculo vinculado={tutorVinculado} />
        </div>
        {!tutorVinculado ? (
          <form action={accionTutor} className="space-y-2">
            <input type="hidden" name="inscripcion_id" value={inscripcionId} />
            <input type="hidden" name="nombre" value="" />
            <div className="flex items-center gap-2">
              <input
                type="email"
                name="email"
                required
                defaultValue={emailTutor ?? ""}
                placeholder="email@ejemplo.com"
                className="flex h-9 w-full rounded-md border border-filo/40 bg-white px-3 text-sm text-tinta"
              />
              <InvitarButton pendingLabel="Invitando…" />
            </div>
            {estadoTutor.error ? (
              <p className="text-sm text-alerta" role="alert">
                {estadoTutor.error}
              </p>
            ) : null}
            {estadoTutor.ok ? (
              <p className="text-sm text-logro">Invitación enviada.</p>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
