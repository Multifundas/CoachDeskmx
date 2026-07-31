"use server";

// Acciones del catálogo de Conceptos:
//  - guardarPreciosConceptos: precio versionado (inserta nueva fila en
//    conceptos_precios con vigencia_desde=hoy; no muta históricos).
//  - sembrarConceptosBase: crea (idempotente por clave) el catálogo canónico
//    para el tenant actual.
import { revalidatePath } from "next/cache";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  CONCEPTOS_BASE,
  esConceptoSistema,
  slugConcepto,
} from "@/lib/data/conceptos";

export interface ConceptosState {
  error: string | null;
  ok: boolean;
}

// tipo_concepto (enum en Postgres).
const TIPOS_CONCEPTO = [
  "clase",
  "inscripcion",
  "competencia",
  "examen",
  "material",
  "otro",
] as const;
type TipoConcepto = (typeof TIPOS_CONCEPTO)[number];

function limpiar(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function guardarPreciosConceptos(
  _prev: ConceptosState,
  formData: FormData,
): Promise<ConceptosState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const supabase = createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  // Inputs name="precio_<conceptoId>". Solo conceptos MXN (no modificadores).
  const nuevos: {
    tenant_id: string;
    concepto_id: string;
    monto: number;
    vigencia_desde: string;
  }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("precio_")) continue;
    const conceptoId = key.slice("precio_".length);
    const raw = String(value ?? "").trim();
    if (raw === "") continue;
    const monto = Number(raw);
    if (!Number.isFinite(monto) || monto < 0) {
      return {
        error: "Los precios deben ser números mayores o iguales a 0.",
        ok: false,
      };
    }
    nuevos.push({
      tenant_id: sesion.tenantId,
      concepto_id: conceptoId,
      monto,
      vigencia_desde: hoy,
    });
  }

  if (nuevos.length === 0) return { error: null, ok: true };

  // Cerrar precios vigentes previos (vigencia_hasta = ayer) para los conceptos
  // que se actualizan, y luego insertar los nuevos.
  const ayer = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  for (const n of nuevos) {
    await supabase
      .from("conceptos_precios")
      .update({ vigencia_hasta: ayer })
      .eq("concepto_id", n.concepto_id)
      .is("vigencia_hasta", null);
  }

  const { error } = await supabase.from("conceptos_precios").insert(nuevos);
  if (error) {
    return { error: "No se pudieron guardar los precios.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

export async function sembrarConceptosBase(
  _prev: ConceptosState,
  _formData: FormData,
): Promise<ConceptosState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const supabase = createClient();
  const filas = CONCEPTOS_BASE.map((c) => ({
    tenant_id: sesion.tenantId,
    clave: c.clave,
    nombre: c.nombre,
    tipo: c.tipo,
    activo: true,
  }));

  const { error } = await supabase
    .from("conceptos")
    .upsert(filas, { onConflict: "tenant_id,clave", ignoreDuplicates: true });

  if (error) {
    return { error: "No se pudo sembrar el catálogo.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/**
 * Crea un concepto nuevo para el tenant. Deriva la clave del nombre y garantiza
 * unicidad; rechaza prefijos reservados de sistema. Precio opcional inicial.
 */
export async function crearConcepto(
  _prev: ConceptosState,
  formData: FormData,
): Promise<ConceptosState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const nombre = limpiar(formData, "nombre");
  const tipo = limpiar(formData, "tipo") || "otro";
  const precioRaw = limpiar(formData, "precio");

  if (nombre.length < 2) {
    return { error: "El nombre del concepto es obligatorio.", ok: false };
  }
  if (!TIPOS_CONCEPTO.includes(tipo as TipoConcepto)) {
    return { error: "Tipo de concepto no válido.", ok: false };
  }

  const claveBase = slugConcepto(nombre);
  if (!claveBase) {
    return { error: "El nombre no genera una clave válida.", ok: false };
  }
  if (esConceptoSistema(claveBase)) {
    return {
      error: "Ese nombre está reservado para conceptos del sistema.",
      ok: false,
    };
  }

  let precio: number | null = null;
  if (precioRaw !== "") {
    precio = Number(precioRaw);
    if (!Number.isFinite(precio) || precio < 0) {
      return { error: "El precio debe ser un número mayor o igual a 0.", ok: false };
    }
  }

  const supabase = createClient();

  // Resolver colisión de clave con sufijo _2, _3, … (revisando las existentes).
  const { data: existentes } = await supabase
    .from("conceptos")
    .select("clave")
    .like("clave", `${claveBase}%`);
  const usadas = new Set(
    ((existentes ?? []) as { clave: string }[]).map((c) => c.clave),
  );
  let clave = claveBase;
  let n = 2;
  while (usadas.has(clave)) {
    clave = `${claveBase}_${n}`;
    n += 1;
  }

  const { data: creado, error } = await supabase
    .from("conceptos")
    .insert({ tenant_id: sesion.tenantId, clave, nombre, tipo, activo: true })
    .select("id")
    .single();

  if (error || !creado) {
    return { error: "No se pudo crear el concepto.", ok: false };
  }

  if (precio !== null) {
    const hoy = new Date().toISOString().slice(0, 10);
    await supabase.from("conceptos_precios").insert({
      tenant_id: sesion.tenantId,
      concepto_id: creado.id,
      monto: precio,
      vigencia_desde: hoy,
    });
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/** Edita nombre/tipo/activo de un concepto (no de sistema). No cambia la clave. */
export async function editarConcepto(
  _prev: ConceptosState,
  formData: FormData,
): Promise<ConceptosState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "id");
  const nombre = limpiar(formData, "nombre");
  const tipo = limpiar(formData, "tipo") || "otro";
  const activo = limpiar(formData, "activo") === "true";

  if (!id) {
    return { error: "Concepto no encontrado.", ok: false };
  }
  if (nombre.length < 2) {
    return { error: "El nombre del concepto es obligatorio.", ok: false };
  }
  if (!TIPOS_CONCEPTO.includes(tipo as TipoConcepto)) {
    return { error: "Tipo de concepto no válido.", ok: false };
  }

  const supabase = createClient();

  const { data: actual } = await supabase
    .from("conceptos")
    .select("clave")
    .eq("id", id)
    .maybeSingle();
  if (!actual) {
    return { error: "Concepto no encontrado.", ok: false };
  }
  if (esConceptoSistema((actual as { clave: string }).clave)) {
    return {
      error: "Los conceptos del sistema no se pueden editar.",
      ok: false,
    };
  }

  const { error } = await supabase
    .from("conceptos")
    .update({ nombre, tipo, activo })
    .eq("id", id);

  if (error) {
    return { error: "No se pudo guardar el concepto.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}

/**
 * Elimina un concepto permanentemente. Exige confirmación. Rechaza conceptos de
 * sistema y aquellos referenciados por inscripcion_tarifas (FK RESTRICT). Los
 * cargos que lo referencian conservan su historial con concepto_id = null.
 */
export async function eliminarConcepto(
  _prev: ConceptosState,
  formData: FormData,
): Promise<ConceptosState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }

  const id = limpiar(formData, "id");
  if (!id) {
    return { error: "Concepto no encontrado.", ok: false };
  }
  if (limpiar(formData, "confirmar") !== "true") {
    return { error: "Confirma la eliminación para continuar.", ok: false };
  }

  const supabase = createClient();

  const { data: actual } = await supabase
    .from("conceptos")
    .select("clave")
    .eq("id", id)
    .maybeSingle();
  if (!actual) {
    return { error: "Concepto no encontrado.", ok: false };
  }
  if (esConceptoSistema((actual as { clave: string }).clave)) {
    return {
      error: "Los conceptos del sistema no se pueden eliminar.",
      ok: false,
    };
  }

  // FK RESTRICT: inscripcion_tarifas bloquea el borrado si hay referencias.
  const { count } = await supabase
    .from("inscripcion_tarifas")
    .select("id", { count: "exact", head: true })
    .eq("concepto_id", id);
  if ((count ?? 0) > 0) {
    return {
      error:
        "No se puede eliminar: hay tarifas de alumnas que usan este concepto. Desactívalo en su lugar.",
      ok: false,
    };
  }

  const { error } = await supabase.from("conceptos").delete().eq("id", id);
  if (error) {
    return { error: "No se pudo eliminar el concepto.", ok: false };
  }

  revalidatePath("/maestra/ajustes");
  return { error: null, ok: true };
}
