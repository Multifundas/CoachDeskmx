"use client";

// Carga masiva de alumnas desde un CSV. Todo el parseo ocurre en el cliente:
// se descarga una plantilla, se sube el archivo, se previsualiza y solo al
// confirmar se envían las filas (como JSON) a la acción del servidor. Sin
// dependencias externas: parser CSV mínimo que soporta comillas y comas.
import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Download, Upload, Users } from "lucide-react";
import {
  importarAlumnasCsv,
  type ImportState,
} from "@/lib/data/alumnas-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const initialState: ImportState = { error: null, ok: false };

// Columnas de la plantilla (en orden). nombre y apellidos son obligatorios.
const COLUMNAS = [
  "nombre",
  "apellidos",
  "fecha_nacimiento",
  "telefono_alumna",
  "sexo",
  "club",
  "tutor_nombre",
  "tutor_telefono",
  "tutor_email",
  "tutor_parentesco",
  "emergencia_nombre",
  "emergencia_telefono",
  "notas_medicas",
] as const;

type Columna = (typeof COLUMNAS)[number];
type Fila = Partial<Record<Columna, string>>;

const PLANTILLA = [
  COLUMNAS.join(","),
  "Ana,García López,2015-03-10,,f,Club Pinos,María López,5512345678,mama@example.com,madre,,,",
].join("\n");

// Parser CSV mínimo: separa por líneas y por comas respetando comillas dobles.
function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

// Mapea filas crudas a objetos usando el encabezado. Tolera columnas de más o
// de menos y encabezados con espacios/mayúsculas.
function aFilas(matriz: string[][]): Fila[] {
  if (matriz.length < 2) return [];
  const encabezado = matriz[0]!.map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_"),
  );
  return matriz.slice(1).map((cols) => {
    const fila: Fila = {};
    encabezado.forEach((h, idx) => {
      if ((COLUMNAS as readonly string[]).includes(h)) {
        fila[h as Columna] = (cols[idx] ?? "").trim();
      }
    });
    return fila;
  });
}

function descargarPlantilla() {
  const blob = new Blob([PLANTILLA], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-alumnas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function SubmitButton({ n }: { n: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || n === 0}>
      {pending ? "Importando…" : `Importar ${n} alumna${n === 1 ? "" : "s"}`}
    </Button>
  );
}

export function ImportarAlumnas() {
  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [state, formAction] = useFormState(importarAlumnasCsv, initialState);
  const inputRef = useRef<HTMLInputElement>(null);

  function limpiar() {
    setFilas([]);
    setErrorArchivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorArchivo(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const texto = await file.text();
    const filasParseadas = aFilas(parseCsv(texto));
    const validas = filasParseadas.filter(
      (f) => (f.nombre ?? "").trim() !== "" || (f.apellidos ?? "").trim() !== "",
    );
    if (validas.length === 0) {
      setErrorArchivo(
        "No se encontraron filas con nombre. Usa la plantilla como base.",
      );
      setFilas([]);
      return;
    }
    setFilas(validas);
  }

  // Las inválidas (sin nombre/apellidos completos) se marcan para que la maestra
  // sepa que se omitirán antes de importar.
  const invalidas = filas.filter(
    (f) => (f.nombre ?? "").trim().length < 2 || (f.apellidos ?? "").trim().length < 2,
  ).length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Users className="h-4 w-4" />
        Carga masiva
      </Button>

      <Dialog
        open={abierto}
        onOpenChange={(v) => {
          setAbierto(v);
          if (!v) limpiar();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carga masiva de alumnas</DialogTitle>
            <DialogDescription>
              Sube un CSV con tus alumnas. Descarga la plantilla, complétala y
              súbela. Solo <strong>nombre</strong> y <strong>apellidos</strong>{" "}
              son obligatorios.
            </DialogDescription>
          </DialogHeader>

          {state.ok ? (
            <div className="space-y-3">
              <p className="rounded-md bg-logro/10 px-4 py-3 text-sm text-tinta">
                Se importaron <strong>{state.creadas}</strong> alumnas.
                {state.fallidas ? (
                  <>
                    {" "}
                    <span className="text-alerta">
                      {state.fallidas} no se pudieron importar.
                    </span>
                  </>
                ) : null}
              </p>
              {state.detalleFallidas && state.detalleFallidas.length > 0 ? (
                <ul className="max-h-40 space-y-1 overflow-auto rounded-md border border-filo/20 p-3 text-xs text-filo">
                  {state.detalleFallidas.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    limpiar();
                    setAbierto(false);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={descargarPlantilla}
                >
                  <Download className="h-4 w-4" />
                  Descargar plantilla
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-filo/40 bg-white px-3 py-2 text-sm font-medium text-tinta hover:bg-hielo/40">
                  <Upload className="h-4 w-4" />
                  {filas.length > 0 ? "Elegir otro archivo" : "Subir CSV"}
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={onArchivo}
                  />
                </label>
              </div>

              {errorArchivo ? (
                <p className="text-sm text-alerta" role="alert">
                  {errorArchivo}
                </p>
              ) : null}

              {filas.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-filo">
                    Vista previa: <strong>{filas.length}</strong> filas
                    {invalidas > 0 ? (
                      <span className="text-alerta">
                        {" "}
                        · {invalidas} se omitirán (faltan nombre/apellidos)
                      </span>
                    ) : null}
                  </p>
                  <div className="max-h-64 overflow-auto rounded-md border border-filo/20">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-hielo/60 text-left text-filo">
                        <tr>
                          <th className="px-3 py-2 font-medium">Nombre</th>
                          <th className="px-3 py-2 font-medium">Apellidos</th>
                          <th className="px-3 py-2 font-medium">Nacimiento</th>
                          <th className="px-3 py-2 font-medium">Tutor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-filo/10">
                        {filas.map((f, i) => {
                          const invalida =
                            (f.nombre ?? "").trim().length < 2 ||
                            (f.apellidos ?? "").trim().length < 2;
                          return (
                            <tr
                              key={i}
                              className={invalida ? "bg-alerta/5" : undefined}
                            >
                              <td className="px-3 py-1.5 text-tinta">
                                {f.nombre || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-tinta">
                                {f.apellidos || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-filo">
                                {f.fecha_nacimiento || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-filo">
                                {f.tutor_nombre || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {state.error ? (
                    <p className="text-sm text-alerta" role="alert">
                      {state.error}
                    </p>
                  ) : null}

                  <form action={formAction} className="flex gap-2">
                    <input
                      type="hidden"
                      name="filas"
                      value={JSON.stringify(filas)}
                    />
                    <SubmitButton n={filas.length - invalidas} />
                    <Button type="button" variant="ghost" onClick={limpiar}>
                      Quitar archivo
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
