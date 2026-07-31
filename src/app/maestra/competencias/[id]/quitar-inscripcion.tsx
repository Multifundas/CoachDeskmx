"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import {
  quitarInscripcion,
  type CompetenciaState,
} from "@/lib/data/competencias-actions";
import { Button } from "@/components/ui/button";

const initialState: CompetenciaState = { error: null, ok: false };

function Boton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label="Quitar inscripción"
      title="Quitar inscripción"
    >
      <Trash2 className="h-4 w-4 text-alerta" />
    </Button>
  );
}

export function QuitarInscripcion({
  inscripcionCompetenciaId,
  competenciaId,
}: {
  inscripcionCompetenciaId: string;
  competenciaId: string;
}) {
  const [, formAction] = useFormState(quitarInscripcion, initialState);
  return (
    <form action={formAction} className="inline">
      <input
        type="hidden"
        name="inscripcion_competencia_id"
        value={inscripcionCompetenciaId}
      />
      <input type="hidden" name="competencia_id" value={competenciaId} />
      <Boton />
    </form>
  );
}
