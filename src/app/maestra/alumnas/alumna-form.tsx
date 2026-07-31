"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import type { EstadoInscripcion, Parentesco, SexoPersona } from "@/types/domain";
import type { AlumnaAdmin, NivelOpcion } from "@/lib/data/alumnas";
import { calcularCategoria } from "@/lib/categoria";
import {
  crearAlumna,
  actualizarInscripcion,
  type AlumnaFormState,
} from "@/lib/data/alumnas-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const initialState: AlumnaFormState = { error: null, ok: false };

const ESTADOS: { value: EstadoInscripcion; label: string }[] = [
  { value: "activa", label: "Activa" },
  { value: "pausada", label: "Pausada" },
  { value: "baja", label: "Baja" },
];

const SEXOS: { value: SexoPersona; label: string }[] = [
  { value: "f", label: "Femenino" },
  { value: "m", label: "Masculino" },
  { value: "x", label: "Otro" },
];

const PARENTESCOS: { value: Parentesco; label: string }[] = [
  { value: "madre", label: "Madre" },
  { value: "padre", label: "Padre" },
  { value: "tutor_legal", label: "Tutor legal" },
  { value: "abuelo", label: "Abuelo/a" },
  { value: "otro", label: "Otro" },
  { value: "la_misma", label: "La alumna" },
];

const selectClass =
  "flex h-10 w-full rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const textareaClass =
  "flex w-full resize-y rounded-md border border-filo/40 bg-white px-3 py-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-2";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : children}
    </Button>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-wide text-filo">
        {titulo}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Campo({
  id,
  label,
  children,
  full = false,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// Campos de ficha reutilizados por alta y edición. `a` precarga valores al editar.
function CamposFicha({
  niveles,
  a,
  prefix,
}: {
  niveles: NivelOpcion[];
  a?: AlumnaAdmin;
  prefix: string;
}) {
  const id = (name: string) => `${prefix}-${name}`;
  const [fechaNac, setFechaNac] = useState(a?.fechaNacimiento ?? "");
  const categoria = calcularCategoria(fechaNac || null);
  return (
    <div className="space-y-5">
      <Seccion titulo="Alumna">
        <Campo id={id("nivel")} label="Nivel">
          <select
            id={id("nivel")}
            name="nivel_actual_id"
            defaultValue={a?.nivelActualId ?? ""}
            className={selectClass}
          >
            <option value="">Sin nivel</option>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre} ({n.rama})
              </option>
            ))}
          </select>
        </Campo>
        <Campo id={id("fecha_nacimiento")} label="Fecha de nacimiento">
          <Input
            id={id("fecha_nacimiento")}
            name="fecha_nacimiento"
            type="date"
            defaultValue={a?.fechaNacimiento ?? ""}
            onChange={(e) => setFechaNac(e.target.value)}
          />
          {categoria ? (
            <p className="text-xs text-filo">
              Categoría:{" "}
              <span className="font-medium text-profundo">
                {categoria.categoriaEdad.nombre}
              </span>
              {categoria.elegibilidadIsuNombre
                ? ` · ${categoria.elegibilidadIsuNombre}`
                : ""}{" "}
              (temporada {categoria.temporada})
            </p>
          ) : null}
        </Campo>
        <Campo id={id("sexo")} label="Sexo">
          <select id={id("sexo")} name="sexo" defaultValue={a?.sexo ?? ""} className={selectClass}>
            <option value="">—</option>
            {SEXOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id={id("telefono_alumna")} label="Teléfono de la alumna">
          <Input
            id={id("telefono_alumna")}
            name="telefono_alumna"
            type="tel"
            defaultValue={a?.telefonoAlumna ?? ""}
          />
        </Campo>
        <Campo id={id("club")} label="Club / deportivo que representa" full>
          <Input id={id("club")} name="club" defaultValue={a?.club ?? ""} />
        </Campo>
      </Seccion>

      <Seccion titulo="Responsable">
        <Campo id={id("tutor_nombre")} label="Nombre">
          <Input id={id("tutor_nombre")} name="tutor_nombre" defaultValue={a?.tutorNombre ?? ""} />
        </Campo>
        <Campo id={id("tutor_parentesco")} label="Parentesco">
          <select
            id={id("tutor_parentesco")}
            name="tutor_parentesco"
            defaultValue={a?.tutorParentesco ?? ""}
            className={selectClass}
          >
            <option value="">—</option>
            {PARENTESCOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id={id("tutor_telefono")} label="Teléfono">
          <Input
            id={id("tutor_telefono")}
            name="tutor_telefono"
            type="tel"
            defaultValue={a?.tutorTelefono ?? ""}
          />
        </Campo>
        <Campo id={id("tutor_email")} label="Email">
          <Input
            id={id("tutor_email")}
            name="tutor_email"
            type="email"
            defaultValue={a?.tutorEmail ?? ""}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Emergencia y salud">
        <Campo id={id("emergencia_nombre")} label="Contacto de emergencia">
          <Input
            id={id("emergencia_nombre")}
            name="emergencia_nombre"
            defaultValue={a?.emergenciaNombre ?? ""}
          />
        </Campo>
        <Campo id={id("emergencia_telefono")} label="Teléfono de emergencia">
          <Input
            id={id("emergencia_telefono")}
            name="emergencia_telefono"
            type="tel"
            defaultValue={a?.emergenciaTelefono ?? ""}
          />
        </Campo>
        <Campo id={id("notas_medicas")} label="Notas médicas / alergias" full>
          <textarea
            id={id("notas_medicas")}
            name="notas_medicas"
            rows={2}
            defaultValue={a?.notasMedicas ?? ""}
            className={textareaClass}
          />
        </Campo>
      </Seccion>
    </div>
  );
}

// ---- Alta de alumna ---------------------------------------------------------
export function AgregarAlumna({ niveles }: { niveles: NivelOpcion[] }) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(crearAlumna, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAbierto(false);
    }
  }, [state.ok]);

  return (
    <>
      <Button onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" />
        Agregar alumna
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva alumna</DialogTitle>
            <DialogDescription>
              Registra la ficha completa. Solo tú puedes verla.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={formAction} className="space-y-5">
            <Seccion titulo="Identidad">
              <Campo id="nueva-nombre" label="Nombre">
                <Input id="nueva-nombre" name="nombre" required minLength={2} />
              </Campo>
              <Campo id="nueva-apellidos" label="Apellidos">
                <Input id="nueva-apellidos" name="apellidos" required minLength={2} />
              </Campo>
              <Campo id="nueva-estado" label="Estado">
                <select id="nueva-estado" name="estado" defaultValue="activa" className={selectClass}>
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </Campo>
            </Seccion>

            <CamposFicha niveles={niveles} prefix="nueva" />

            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <SubmitButton>Guardar alumna</SubmitButton>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- Edición de una inscripción --------------------------------------------
export function EditarAlumna({
  alumna,
  niveles,
}: {
  alumna: AlumnaAdmin;
  niveles: NivelOpcion[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(actualizarInscripcion, initialState);

  useEffect(() => {
    if (state.ok) setAbierto(false);
  }, [state.ok]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        Editar
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar {alumna.nombre} {alumna.apellidos}
            </DialogTitle>
            <DialogDescription>Actualiza la ficha de la alumna.</DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-5 text-left">
            <input type="hidden" name="inscripcion_id" value={alumna.inscripcionId} />
            <input type="hidden" name="persona_id" value={alumna.personaId} />

            <Seccion titulo="Inscripción">
              <Campo id={`edit-estado-${alumna.inscripcionId}`} label="Estado">
                <select
                  id={`edit-estado-${alumna.inscripcionId}`}
                  name="estado"
                  defaultValue={alumna.estado}
                  className={selectClass}
                >
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo id={`edit-notas-${alumna.inscripcionId}`} label="Notas privadas" full>
                <textarea
                  id={`edit-notas-${alumna.inscripcionId}`}
                  name="notas_privadas"
                  rows={2}
                  defaultValue={alumna.notasPrivadas ?? ""}
                  className={textareaClass}
                  placeholder="Solo visibles para ti."
                />
              </Campo>
            </Seccion>

            <CamposFicha niveles={niveles} a={alumna} prefix={`edit-${alumna.inscripcionId}`} />

            {state.error ? (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <SubmitButton>Guardar cambios</SubmitButton>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
