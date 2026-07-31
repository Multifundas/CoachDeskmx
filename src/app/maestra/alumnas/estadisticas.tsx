import type { AlumnaAdmin } from "@/lib/data/alumnas";
import { calcularEdad, antiguedadMeses } from "@/lib/fecha";
import { calcularCategoria, CATEGORIAS_EDAD } from "@/lib/categoria";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Fila de una distribución: etiqueta + conteo, con barra proporcional.
interface Bucket {
  label: string;
  valor: number;
}

function Distribucion({ datos }: { datos: Bucket[] }) {
  const total = datos.reduce((s, d) => s + d.valor, 0);
  const max = Math.max(1, ...datos.map((d) => d.valor));

  if (total === 0) {
    return <p className="text-sm text-filo">Sin datos suficientes.</p>;
  }

  return (
    <ul className="space-y-3">
      {datos.map((d) => {
        const pct = Math.round((d.valor / total) * 100);
        const ancho = Math.round((d.valor / max) * 100);
        return (
          <li key={d.label} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-tinta">{d.label}</span>
              <span className="text-filo">
                {d.valor} · {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-hielo">
              <div
                className="h-full rounded-full bg-profundo"
                style={{ width: `${ancho}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Agrupa las edades en rangos útiles para patinaje artístico.
function distribucionEdades(alumnas: AlumnaAdmin[]): Bucket[] {
  const rangos: { label: string; test: (e: number) => boolean }[] = [
    { label: "Menores de 6", test: (e) => e < 6 },
    { label: "6 a 9", test: (e) => e >= 6 && e <= 9 },
    { label: "10 a 13", test: (e) => e >= 10 && e <= 13 },
    { label: "14 a 17", test: (e) => e >= 14 && e <= 17 },
    { label: "18 o más", test: (e) => e >= 18 },
  ];
  const conteo = rangos.map((r) => ({ label: r.label, valor: 0 }));
  let sinDato = 0;
  for (const a of alumnas) {
    const edad = calcularEdad(a.fechaNacimiento);
    if (edad === null) {
      sinDato += 1;
      continue;
    }
    const i = rangos.findIndex((r) => r.test(edad));
    if (i >= 0) conteo[i]!.valor += 1;
  }
  if (sinDato > 0) conteo.push({ label: "Sin fecha", valor: sinDato });
  return conteo.filter((c) => c.valor > 0);
}

// Distribución por categoría FEMEPASHIDI (según fecha de nacimiento). Mantiene
// el orden oficial de categorías y agrupa las que no tienen fecha.
function distribucionCategorias(alumnas: AlumnaAdmin[]): Bucket[] {
  const conteo = new Map<string, number>();
  let sinDato = 0;
  for (const a of alumnas) {
    const cat = calcularCategoria(a.fechaNacimiento);
    if (!cat) {
      sinDato += 1;
      continue;
    }
    const nombre = cat.categoriaEdad.nombre;
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
  }
  const ordenado = CATEGORIAS_EDAD.map((c) => ({
    label: c.nombre,
    valor: conteo.get(c.nombre) ?? 0,
  })).filter((b) => b.valor > 0);
  if (sinDato > 0) ordenado.push({ label: "Sin fecha", valor: sinDato });
  return ordenado;
}

// Cuenta alumnas por nivel actual (agrupa las que no tienen nivel).
function distribucionNiveles(alumnas: AlumnaAdmin[]): Bucket[] {
  const mapa = new Map<string, number>();
  for (const a of alumnas) {
    const nivel = a.nivelActual ?? "Sin nivel";
    mapa.set(nivel, (mapa.get(nivel) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((x, y) => y.valor - x.valor);
}

// Agrupa por antigüedad (tiempo inscrita con la maestra).
function distribucionAntiguedad(alumnas: AlumnaAdmin[]): Bucket[] {
  const rangos: { label: string; test: (m: number) => boolean }[] = [
    { label: "Menos de 6 meses", test: (m) => m < 6 },
    { label: "6 a 11 meses", test: (m) => m >= 6 && m < 12 },
    { label: "1 a 2 años", test: (m) => m >= 12 && m < 36 },
    { label: "3 años o más", test: (m) => m >= 36 },
  ];
  const conteo = rangos.map((r) => ({ label: r.label, valor: 0 }));
  for (const a of alumnas) {
    const meses = antiguedadMeses(a.fechaAlta);
    if (meses === null) continue;
    const i = rangos.findIndex((r) => r.test(meses));
    if (i >= 0) conteo[i]!.valor += 1;
  }
  return conteo.filter((c) => c.valor > 0);
}

// Promedio de edad (solo alumnas con fecha de nacimiento).
function edadPromedio(alumnas: AlumnaAdmin[]): number | null {
  const edades = alumnas
    .map((a) => calcularEdad(a.fechaNacimiento))
    .filter((e): e is number => e !== null);
  if (edades.length === 0) return null;
  return Math.round((edades.reduce((s, e) => s + e, 0) / edades.length) * 10) / 10;
}

export function EstadisticasAlumnas({ alumnas }: { alumnas: AlumnaAdmin[] }) {
  const edades = distribucionEdades(alumnas);
  const categorias = distribucionCategorias(alumnas);
  const niveles = distribucionNiveles(alumnas);
  const antiguedad = distribucionAntiguedad(alumnas);
  const promedio = edadPromedio(alumnas);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-tinta">
          Perfil del grupo
        </h2>
        <p className="text-sm text-filo">
          Cómo están distribuidas tus alumnas por edad, categoría, nivel y
          antigüedad.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Edades</CardTitle>
            {promedio !== null ? (
              <p className="text-sm text-filo">Promedio: {promedio} años</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <Distribucion datos={edades} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorías</CardTitle>
            <p className="text-sm text-filo">FEMEPASHIDI, por fecha de nacimiento.</p>
          </CardHeader>
          <CardContent>
            <Distribucion datos={categorias} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Niveles</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribucion datos={niveles} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Antigüedad</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribucion datos={antiguedad} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
