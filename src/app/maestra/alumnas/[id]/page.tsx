import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Parentesco, SexoPersona } from "@/types/domain";
import { requireRol } from "@/lib/auth/guard";
import { obtenerAlumna, listarNiveles } from "@/lib/data/alumnas";
import { obtenerDesempeno } from "@/lib/data/desempeno";
import { formatMXN } from "@/lib/money";
import { fechaDia, calcularEdad } from "@/lib/fecha";
import { calcularCategoria } from "@/lib/categoria";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditarAlumna } from "../alumna-form";
import { CompartirCalendario } from "./compartir-calendario";
import { CompartirDesempeno } from "./compartir-desempeno";
import { DesempenoPanel } from "./desempeno-panel";
import { VincularLogin } from "./vincular-login";

const SEXO_LABEL: Record<SexoPersona, string> = {
  f: "Femenino",
  m: "Masculino",
  x: "Otro",
};

const PARENTESCO_LABEL: Record<Parentesco, string> = {
  madre: "Madre",
  padre: "Padre",
  tutor_legal: "Tutor legal",
  abuelo: "Abuelo/a",
  otro: "Otro",
  la_misma: "La alumna",
};

function Dato({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-filo">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-tinta">{valor?.trim() ? valor : "—"}</dd>
    </div>
  );
}

export default async function AlumnaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  await requireRol(["super_admin", "maestra", "coach_asistente"]);

  const [alumna, niveles, desempeno] = await Promise.all([
    obtenerAlumna(params.id),
    listarNiveles(),
    obtenerDesempeno(params.id),
  ]);

  if (!alumna) notFound();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const categoria = calcularCategoria(alumna.fechaNacimiento);

  const estadoVariant =
    alumna.estado === "activa"
      ? "success"
      : alumna.estado === "pausada"
        ? "secondary"
        : "outline";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/maestra/alumnas">
          <ArrowLeft className="h-4 w-4" />
          Volver a alumnas
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-tinta">
              {alumna.nombre} {alumna.apellidos}
            </h1>
            <Badge variant={estadoVariant}>{alumna.estado}</Badge>
          </div>
          <p className="text-sm text-filo">
            {alumna.nivelActual ?? "Sin nivel"} · Inscrita el{" "}
            {fechaDia(alumna.fechaAlta)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <EditarAlumna alumna={alumna} niveles={niveles} />
          <CompartirCalendario
            inscripcionId={alumna.inscripcionId}
            alumna={`${alumna.nombre} ${alumna.apellidos}`}
            appUrl={appUrl}
          />
          <CompartirDesempeno
            inscripcionId={alumna.inscripcionId}
            alumna={`${alumna.nombre} ${alumna.apellidos}`}
            appUrl={appUrl}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="Nivel" valor={alumna.nivelActual ?? "—"} />
        <KpiCard
          titulo="Categoría"
          valor={categoria ? categoria.categoriaEdad.nombre : "—"}
          hint={
            categoria
              ? `Temporada ${categoria.temporada}`
              : "Falta fecha de nacimiento"
          }
        />
        <KpiCard
          titulo="Saldo"
          valor={formatMXN(alumna.saldoMxn)}
          mono
          hint={alumna.saldoMxn > 0 ? "Con adeudo" : "Al corriente"}
        />
        <KpiCard
          titulo="Edad"
          valor={
            alumna.fechaNacimiento
              ? `${calcularEdad(alumna.fechaNacimiento)} años`
              : "—"
          }
          hint={
            alumna.fechaNacimiento
              ? `Nac. ${fechaDia(alumna.fechaNacimiento)}`
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la alumna</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato
                label="Sexo"
                valor={alumna.sexo ? SEXO_LABEL[alumna.sexo] : null}
              />
              <Dato label="Teléfono" valor={alumna.telefonoAlumna} />
              <Dato label="Fecha de nacimiento" valor={fechaDia(alumna.fechaNacimiento)} />
              <Dato label="Club / deportivo" valor={alumna.club} />
              <Dato
                label="Categoría (edad)"
                valor={categoria ? categoria.categoriaEdad.nombre : null}
              />
              <Dato
                label="Elegibilidad ISU"
                valor={categoria?.elegibilidadIsuNombre ?? null}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsable</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato label="Nombre" valor={alumna.tutorNombre} />
              <Dato
                label="Parentesco"
                valor={
                  alumna.tutorParentesco
                    ? PARENTESCO_LABEL[alumna.tutorParentesco]
                    : null
                }
              />
              <Dato label="Teléfono" valor={alumna.tutorTelefono} />
              <Dato label="Email" valor={alumna.tutorEmail} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergencia y salud</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato label="Contacto de emergencia" valor={alumna.emergenciaNombre} />
              <Dato label="Teléfono de emergencia" valor={alumna.emergenciaTelefono} />
              <div className="sm:col-span-2">
                <Dato label="Notas médicas / alergias" valor={alumna.notasMedicas} />
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato label="Estado" valor={alumna.estado} />
              <Dato label="Fecha de alta" valor={fechaDia(alumna.fechaAlta)} />
              {alumna.fechaBaja ? (
                <Dato label="Fecha de baja" valor={fechaDia(alumna.fechaBaja)} />
              ) : null}
              <div className="sm:col-span-2">
                <Dato label="Notas privadas" valor={alumna.notasPrivadas} />
              </div>
              <div className="sm:col-span-2">
                <Link
                  href="/maestra/estados-cuenta"
                  className="inline-flex items-center gap-1 text-sm font-medium text-logro transition-colors hover:underline"
                >
                  Ver estados de cuenta
                </Link>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceso a la app</CardTitle>
          </CardHeader>
          <CardContent>
            <VincularLogin
              inscripcionId={alumna.inscripcionId}
              emailTutor={alumna.tutorEmail}
              alumnaVinculada={alumna.alumnaAppUserId !== null}
              tutorVinculado={alumna.tutorAppUserId !== null}
            />
          </CardContent>
        </Card>

        <DesempenoPanel
          inscripcionId={alumna.inscripcionId}
          desempeno={desempeno ?? {
            nivelActual: alumna.nivelActual,
            proximoNivel: null,
            elementos: [],
            progresoPct: 0,
            tareas: [],
          }}
        />
      </div>
    </div>
  );
}
