import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRol } from "@/lib/auth/guard";
import { obtenerMiInscripcionAlumna } from "@/lib/data/dashboard";
import { obtenerDesempeno } from "@/lib/data/desempeno";
import { fechaDia } from "@/lib/fecha";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ESTADO_LABEL = {
  pendiente: { texto: "Pendiente", variant: "secondary" as const },
  en_progreso: { texto: "En progreso", variant: "outline" as const },
  dominado: { texto: "Dominado", variant: "success" as const },
};

export default async function AlumnaProgresoPage() {
  await requireRol(["alumna"]);
  const inscripcion = await obtenerMiInscripcionAlumna();

  const desempeno = inscripcion
    ? await obtenerDesempeno(inscripcion.inscripcionId)
    : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/alumna">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </Button>

      <div>
        <h1 className="font-display text-2xl font-bold text-tinta">
          Mi progreso
        </h1>
        <p className="text-sm text-filo">
          Camino al próximo nivel y tareas.
        </p>
      </div>

      {!desempeno ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-filo">
            Aún no hay información de progreso.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {desempeno.proximoNivel
                  ? `Camino a ${desempeno.proximoNivel}`
                  : "Camino al próximo nivel"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-filo">Progreso</span>
                  <span className="font-medium text-tinta">
                    {desempeno.progresoPct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-hielo">
                  <div
                    className="h-full rounded-full bg-logro"
                    style={{ width: `${desempeno.progresoPct}%` }}
                  />
                </div>
              </div>

              {desempeno.elementos.length === 0 ? (
                <p className="text-sm text-filo">
                  Aún no hay elementos configurados.
                </p>
              ) : (
                <ul className="space-y-2">
                  {desempeno.elementos.map((e) => {
                    const meta = ESTADO_LABEL[e.estado];
                    return (
                      <li
                        key={e.elementoId}
                        className="flex items-center justify-between gap-3 rounded-md border border-filo/15 p-3"
                      >
                        <div>
                          <p className="text-sm text-tinta">
                            {e.clave ? `${e.clave} · ` : ""}
                            {e.descripcion}
                          </p>
                          {e.nota ? (
                            <p className="text-xs text-filo">{e.nota}</p>
                          ) : null}
                        </div>
                        <Badge variant={meta.variant}>{meta.texto}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tareas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {desempeno.tareas.length === 0 ? (
                <p className="text-sm text-filo">No hay tareas pendientes.</p>
              ) : (
                desempeno.tareas.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-filo/15 p-3"
                  >
                    <div>
                      <p className="text-sm text-tinta">{t.titulo}</p>
                      {t.fechaLimite ? (
                        <p className="text-xs text-filo">
                          Para el {fechaDia(t.fechaLimite)}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={t.hecha ? "success" : "secondary"}>
                      {t.hecha ? "Hecha" : "Pendiente"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
