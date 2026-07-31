"use server";

// Acciones de Estados de Cuenta: generar el corte mensual (congela cargos en
// estados_cuenta con folio + snapshot) y agregar conceptos extra antes de sellar.
// estados_cuenta es INMUTABLE (triggers); por eso validamos mutabilidad de los
// cargos ANTES de insertar el statement.
import { revalidatePath } from "next/cache";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface EdcState {
  error: string | null;
  ok: boolean;
  edcId?: string;
  token?: string;
}

/**
 * Agrega un concepto extra (cargo manual) a una alumna en un periodo, antes de
 * sellar el corte. Rechaza si ya existe un EdC sellado para ese periodo/alumna.
 */
export async function agregarConceptoExtra(
  _prev: EdcState,
  formData: FormData,
): Promise<EdcState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;
  const supabase = createClient();

  const inscripcionId = String(formData.get("inscripcion_id") ?? "").trim();
  const periodo = String(formData.get("periodo") ?? "").trim();
  const conceptoId = String(formData.get("concepto_id") ?? "").trim() || null;
  const montoRaw = String(formData.get("monto") ?? "").trim();

  if (!inscripcionId || !periodo) {
    return { error: "Faltan alumna o periodo.", ok: false };
  }
  const monto = Number(montoRaw);
  if (!Number.isFinite(monto) || monto < 0) {
    return { error: "El monto debe ser un número mayor o igual a 0.", ok: false };
  }

  // Guard: no debe existir un EdC sellado para ese periodo+alumna.
  const { data: existente } = await supabase
    .from("estados_cuenta")
    .select("id")
    .eq("inscripcion_id", inscripcionId)
    .eq("periodo", periodo)
    .maybeSingle();
  if (existente) {
    return {
      error: "Ya existe un estado de cuenta sellado para este periodo.",
      ok: false,
    };
  }

  const { error } = await supabase.from("cargos").insert({
    tenant_id: tenantId,
    inscripcion_id: inscripcionId,
    concepto_id: conceptoId,
    monto,
    periodo,
    origen: "manual",
    estado: "pendiente",
  });
  if (error) {
    return { error: "No se pudo agregar el concepto.", ok: false };
  }

  revalidatePath("/maestra/estados-cuenta");
  revalidatePath("/maestra/cobranza");
  return { error: null, ok: true };
}

/**
 * Genera (sella) el estado de cuenta de una alumna para un periodo: selecciona
 * los cargos abiertos, valida su mutabilidad, inserta el statement con snapshot y
 * marca los cargos como 'en_corte'. Rollback parcial no aplica al statement
 * (inmutable): validamos mutabilidad antes de insertarlo.
 */
export async function generarEstadoCuenta(
  _prev: EdcState,
  formData: FormData,
): Promise<EdcState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;
  const supabase = createClient();

  const inscripcionId = String(formData.get("inscripcion_id") ?? "").trim();
  const periodo = String(formData.get("periodo") ?? "").trim();
  if (!inscripcionId || !periodo) {
    return { error: "Selecciona alumna y periodo.", ok: false };
  }

  // Paso 1: cargos abiertos del periodo. Validar mutabilidad ANTES de insertar.
  // Se trae la ocurrencia (fecha/hora) y la sede (ubicación) del cargo para que
  // el snapshot congelado tenga el detalle que la mamá necesita para no dudar.
  const { data: cargosData } = await supabase
    .from("cargos")
    .select(
      "id, monto, origen, estado, estado_cuenta_id, concepto:conceptos(nombre), ocurrencia:evento_ocurrencias(inicio_utc, evento:eventos(sede:sedes(nombre, timezone)))",
    )
    .eq("inscripcion_id", inscripcionId)
    .eq("periodo", periodo)
    .is("estado_cuenta_id", null)
    .in("estado", ["pendiente", "parcial"]);

  interface CargoRow {
    id: string;
    monto: number;
    origen: string;
    estado: string;
    estado_cuenta_id: string | null;
    concepto: { nombre: string } | null;
    ocurrencia: {
      inicio_utc: string;
      evento: {
        sede: { nombre: string; timezone: string } | null;
      } | null;
    } | null;
  }
  const cargos = (cargosData ?? []) as unknown as CargoRow[];
  if (cargos.length === 0) {
    return {
      error: "No hay cargos abiertos para este periodo.",
      ok: false,
    };
  }

  const total =
    Math.round(cargos.reduce((s, c) => s + Number(c.monto), 0) * 100) / 100;

  const snapshot = {
    periodo,
    generado_at: new Date().toISOString(),
    cargos: cargos.map((c) => ({
      id: c.id,
      concepto: c.concepto?.nombre ?? "—",
      origen: c.origen,
      monto: Number(c.monto),
      estado: c.estado,
      fechaUtc: c.ocurrencia?.inicio_utc ?? null,
      ubicacion: c.ocurrencia?.evento?.sede?.nombre ?? null,
      timezone: c.ocurrencia?.evento?.sede?.timezone ?? null,
    })),
  };

  // Paso 2: insertar el statement, reintentando el folio ante colisión (23505).
  const base = `${periodo}-${inscripcionId.slice(0, 4)}`;
  let edcId: string | null = null;
  for (let intento = 0; intento < 5 && !edcId; intento++) {
    const sufijo = intento === 0 ? "" : `-${intento + 1}`;
    const folio = `${base}${sufijo}`;
    const { data, error } = await supabase
      .from("estados_cuenta")
      .insert({
        tenant_id: tenantId,
        inscripcion_id: inscripcionId,
        folio,
        periodo,
        total,
        snapshot,
      })
      .select("id")
      .single();
    if (!error && data) {
      edcId = (data as { id: string }).id;
      break;
    }
    if (error && error.code !== "23505") {
      return { error: "No se pudo generar el estado de cuenta.", ok: false };
    }
  }
  if (!edcId) {
    return { error: "No se pudo asignar un folio único.", ok: false };
  }

  // Paso 3: marcar los cargos como en corte.
  const { error: updErr } = await supabase
    .from("cargos")
    .update({ estado_cuenta_id: edcId, estado: "en_corte" })
    .in(
      "id",
      cargos.map((c) => c.id),
    );
  if (updErr) {
    // El statement ya existe y es inmutable; queda un huérfano inofensivo.
    return {
      error:
        "El corte se creó pero no se pudieron congelar los cargos. Revisa el estado de cuenta.",
      ok: false,
    };
  }

  revalidatePath("/maestra/estados-cuenta");
  revalidatePath("/maestra/cobranza");
  return { error: null, ok: true, edcId };
}

/**
 * Crea (o reutiliza) un token público para compartir un estado de cuenta por
 * enlace (p. ej. WhatsApp). El enlace es de solo lectura y sin login. Si ya
 * existe un token activo para ese EdC, lo reutiliza en vez de proliferar.
 * Devuelve el token en el estado para que la UI arme la URL.
 */
export async function crearTokenEstadoCuenta(
  _prev: EdcState,
  formData: FormData,
): Promise<EdcState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;
  const supabase = createClient();

  const edcId = String(formData.get("edc_id") ?? "").trim();
  if (!edcId) return { error: "Estado de cuenta no encontrado.", ok: false };

  // Verifica que el EdC exista y sea del tenant (RLS ya lo limita, pero validamos
  // para dar un error claro).
  const { data: edc } = await supabase
    .from("estados_cuenta")
    .select("id")
    .eq("id", edcId)
    .maybeSingle();
  if (!edc) {
    return { error: "Estado de cuenta no encontrado.", ok: false };
  }

  // Reutiliza un token activo existente para este recurso.
  const { data: existente } = await supabase
    .from("tokens_publicos")
    .select("token")
    .eq("recurso_tipo", "estado_cuenta")
    .eq("recurso_id", edcId)
    .eq("revocado", false)
    .maybeSingle();

  if (existente?.token) {
    return { error: null, ok: true, token: existente.token };
  }

  const token = crypto.randomUUID();
  const { error } = await supabase.from("tokens_publicos").insert({
    tenant_id: tenantId,
    token,
    recurso_tipo: "estado_cuenta",
    recurso_id: edcId,
  });
  if (error) {
    return { error: "No se pudo generar el enlace.", ok: false };
  }

  revalidatePath("/maestra/estados-cuenta");
  return { error: null, ok: true, token };
}
