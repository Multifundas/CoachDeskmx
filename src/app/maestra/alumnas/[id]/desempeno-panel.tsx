"use client";

// Panel de desempeño de la alumna (para la maestra). Muestra el camino al
// próximo nivel (elementos oficiales del examen con su estado editable) y las
// tareas para la mamá (checklist). Cada acción es un Server Action independiente
// que revalida la ficha.
import { useFormStatus } from "react-dom";
import { Plus, Target, Trash2 } from "lucide-react";
import type {
  DesempenoAlumna,
  DesempenoElemento,
  EstadoElemento,
  TareaAlumna,
} from "@/lib/data/desempeno";
import {
  alternarTarea,
  crearTarea,
  eliminarTarea,
  marcarElemento,
} from "@/lib/data/desempeno-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fechaDia } from "@/lib/fecha";

const selectClass =
  "h-9 rounded-md border border-filo/40 bg-white px-2 text-sm text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profundo focus-visible:ring-offset-1";

const ESTADOS: { valor: EstadoElemento; label: string }[] = [
  { valor: "pendiente", label: "Pendiente" },
  { valor: "en_progreso", label: "En progreso" },
  { valor: "dominado", label: "Dominado" },
];

function ElementoFila({
  inscripcionId,
  elemento,
}: {
  inscripcionId: string;
  elemento: DesempenoElemento;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-tinta">
        {elemento.clave ? (
          <span className="mr-1 font-medium text-profundo">
            {elemento.clave}
          </span>
        ) : null}
        {elemento.descripcion}
      </span>
      <form action={marcarElemento} className="shrink-0">
        <input type="hidden" name="inscripcion_id" value={inscripcionId} />
        <input type="hidden" name="elemento_id" value={elemento.elementoId} />
        <select
          name="estado"
          defaultValue={elemento.estado}
          className={selectClass}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          {ESTADOS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.label}
            </option>
          ))}
        </select>
      </form>
    </li>
  );
}

function AgregarTareaButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? "Agregando…" : "Agregar"}
    </Button>
  );
}

function TareaFila({ tarea }: { tarea: TareaAlumna }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <form action={alternarTarea}>
          <input type="hidden" name="tarea_id" value={tarea.id} />
          <input type="hidden" name="hecha" value={String(tarea.hecha)} />
          <button
            type="submit"
            className="flex h-5 w-5 items-center justify-center rounded border border-filo/40 text-white"
            style={{
              backgroundColor: tarea.hecha ? "var(--logro, #16a34a)" : undefined,
            }}
            aria-label={tarea.hecha ? "Marcar pendiente" : "Marcar hecha"}
            title={tarea.hecha ? "Marcar pendiente" : "Marcar hecha"}
          >
            {tarea.hecha ? "✓" : ""}
          </button>
        </form>
        <div>
          <p
            className={`text-sm ${tarea.hecha ? "text-filo line-through" : "text-tinta"}`}
          >
            {tarea.titulo}
          </p>
          {tarea.fechaLimite ? (
            <p className="text-xs text-filo">
              Para el {fechaDia(tarea.fechaLimite)}
            </p>
          ) : null}
        </div>
      </div>
      <form action={eliminarTarea}>
        <input type="hidden" name="tarea_id" value={tarea.id} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-filo hover:text-alerta"
          title="Eliminar tarea"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </form>
    </li>
  );
}

export function DesempenoPanel({
  inscripcionId,
  desempeno,
}: {
  inscripcionId: string;
  desempeno: DesempenoAlumna;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-profundo" />
          Desempeño
          {desempeno.proximoNivel ? (
            <span className="text-sm font-normal text-filo">
              · Camino a {desempeno.proximoNivel}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {desempeno.proximoNivel ? (
          <section className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-tinta">Progreso</span>
                <span className="text-filo">{desempeno.progresoPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-filo/15">
                <div
                  className="h-full rounded-full bg-logro transition-all"
                  style={{ width: `${desempeno.progresoPct}%` }}
                />
              </div>
            </div>

            {desempeno.elementos.length === 0 ? (
              <p className="text-sm text-filo">
                Este nivel no tiene elementos registrados en el catálogo.
              </p>
            ) : (
              <ul className="divide-y divide-filo/10">
                {desempeno.elementos.map((e) => (
                  <ElementoFila
                    key={e.elementoId}
                    inscripcionId={inscripcionId}
                    elemento={e}
                  />
                ))}
              </ul>
            )}
          </section>
        ) : (
          <p className="text-sm text-filo">
            {desempeno.nivelActual
              ? "La alumna está en el nivel más alto de su rama."
              : "Asigna un nivel a la alumna para ver su camino al siguiente."}
          </p>
        )}

        <section className="space-y-3 border-t border-filo/15 pt-4">
          <h3 className="text-sm font-medium text-tinta">Tareas para la mamá</h3>

          <form
            action={crearTarea}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="inscripcion_id" value={inscripcionId} />
            <div className="flex-1">
              <Input
                name="titulo"
                required
                minLength={2}
                placeholder="Ej. Practicar giro sentado 3 veces por semana"
              />
            </div>
            <Input
              name="fecha_limite"
              type="date"
              className="w-auto"
              title="Fecha límite (opcional)"
            />
            <AgregarTareaButton />
          </form>

          {desempeno.tareas.length === 0 ? (
            <p className="text-sm text-filo">Sin tareas por ahora.</p>
          ) : (
            <ul className="divide-y divide-filo/10">
              {desempeno.tareas.map((t) => (
                <TareaFila key={t.id} tarea={t} />
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
