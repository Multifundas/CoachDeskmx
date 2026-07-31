"use server";

// Acciones de Cobranza: registrar pagos con abonos (pagos + pagos_aplicaciones,
// recomputando el estado de cada cargo) y cancelar un cargo. Sin transacciones
// multi-statement en supabase-js → rollback manual por pasos.
import { revalidatePath } from "next/cache";
import type { MetodoPago } from "@/types/domain";
import { getSesion } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface CobranzaState {
  error: string | null;
  ok: boolean;
}

const METODOS: MetodoPago[] = ["efectivo", "transferencia", "tarjeta", "otro"];

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Registra un pago aplicándolo a uno o más cargos de una misma alumna. Cada cargo
 * recibe un abono (`aplic_<cargoId>`, por defecto su saldo). Recalcula el estado
 * de cada cargo (pagado / parcial). Rollback manual si falla algún paso.
 */
export async function registrarPago(
  _prev: CobranzaState,
  formData: FormData,
): Promise<CobranzaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const tenantId = sesion.tenantId;
  const supabase = createClient();

  const inscripcionId = String(formData.get("inscripcion_id") ?? "").trim();
  const metodoRaw = String(formData.get("metodo") ?? "transferencia").trim();
  const metodo: MetodoPago = (METODOS as string[]).includes(metodoRaw)
    ? (metodoRaw as MetodoPago)
    : "transferencia";
  const referencia = String(formData.get("referencia") ?? "").trim() || null;
  const pagadoAtRaw = String(formData.get("pagado_at") ?? "").trim();
  const cargoIds = formData.getAll("cargo_ids").map((v) => String(v));

  if (!inscripcionId || cargoIds.length === 0) {
    return { error: "Selecciona una alumna y al menos un cargo.", ok: false };
  }

  // Cargar los cargos elegidos con su saldo actual (monto - aplicaciones).
  const { data: cargosData, error: cargosErr } = await supabase
    .from("cargos")
    .select(
      "id, inscripcion_id, monto, estado, estado_cuenta_id, aplicaciones:pagos_aplicaciones(monto)",
    )
    .in("id", cargoIds);
  if (cargosErr || !cargosData || cargosData.length !== cargoIds.length) {
    return { error: "No se pudieron cargar los cargos seleccionados.", ok: false };
  }

  interface CargoRow {
    id: string;
    inscripcion_id: string;
    monto: number;
    estado: string;
    estado_cuenta_id: string | null;
    aplicaciones: { monto: number }[] | null;
  }
  const cargos = cargosData as unknown as CargoRow[];

  // Validaciones: misma alumna, mutables, abono <= saldo.
  const aplicaciones: { cargoId: string; monto: number; nuevoEstado: string }[] =
    [];
  let totalPago = 0;
  for (const c of cargos) {
    if (c.inscripcion_id !== inscripcionId) {
      return { error: "Todos los cargos deben ser de la misma alumna.", ok: false };
    }
    if (c.estado === "cancelado" || c.estado === "en_corte") {
      return {
        error: "Hay cargos cancelados o en corte; no admiten pago.",
        ok: false,
      };
    }
    const monto = Number(c.monto);
    const aplicado = (c.aplicaciones ?? []).reduce(
      (s, a) => s + Number(a.monto),
      0,
    );
    const saldo = round2(monto - aplicado);
    if (saldo <= 0) continue;

    const abonoRaw = String(formData.get(`aplic_${c.id}`) ?? "").trim();
    const abono = abonoRaw === "" ? saldo : Number(abonoRaw);
    if (!Number.isFinite(abono) || abono <= 0) {
      return { error: "Los abonos deben ser mayores a 0.", ok: false };
    }
    if (abono > saldo + 0.001) {
      return { error: "Un abono no puede exceder el saldo del cargo.", ok: false };
    }
    const nuevoAplicado = round2(aplicado + abono);
    const nuevoEstado = nuevoAplicado >= monto - 0.001 ? "pagado" : "parcial";
    aplicaciones.push({ cargoId: c.id, monto: round2(abono), nuevoEstado });
    totalPago = round2(totalPago + abono);
  }

  if (aplicaciones.length === 0 || totalPago <= 0) {
    return { error: "No hay saldo por abonar en los cargos elegidos.", ok: false };
  }

  const pagadoAtUtc = pagadoAtRaw
    ? new Date(`${pagadoAtRaw}T12:00:00`).toISOString()
    : new Date().toISOString();

  // Paso 1: insertar el pago.
  const { data: pagoData, error: pagoErr } = await supabase
    .from("pagos")
    .insert({
      tenant_id: tenantId,
      inscripcion_id: inscripcionId,
      monto: totalPago,
      metodo,
      referencia,
      pagado_at_utc: pagadoAtUtc,
    })
    .select("id")
    .single();
  if (pagoErr || !pagoData) {
    return { error: "No se pudo registrar el pago.", ok: false };
  }
  const pagoId = (pagoData as { id: string }).id;

  // Paso 2: insertar las aplicaciones.
  const { error: aplicErr } = await supabase.from("pagos_aplicaciones").insert(
    aplicaciones.map((a) => ({
      tenant_id: tenantId,
      pago_id: pagoId,
      cargo_id: a.cargoId,
      monto: a.monto,
    })),
  );
  if (aplicErr) {
    // Rollback: borrar el pago (no hay aplicaciones que borrar si esto falló).
    await supabase.from("pagos").delete().eq("id", pagoId);
    return { error: "No se pudieron aplicar los abonos al pago.", ok: false };
  }

  // Paso 3: recalcular el estado de cada cargo.
  for (const a of aplicaciones) {
    await supabase
      .from("cargos")
      .update({ estado: a.nuevoEstado })
      .eq("id", a.cargoId);
  }

  revalidatePath("/maestra/cobranza");
  return { error: null, ok: true };
}

/**
 * Cancela un cargo. Rechaza si está en corte (estado_cuenta_id) o ya tiene pagos
 * aplicados.
 */
export async function cancelarCargo(
  _prev: CobranzaState,
  formData: FormData,
): Promise<CobranzaState> {
  const sesion = await getSesion();
  if (!sesion?.tenantId) {
    return { error: "Sesión sin tenant. Vuelve a iniciar sesión.", ok: false };
  }
  const supabase = createClient();

  const cargoId = String(formData.get("cargo_id") ?? "").trim();
  if (!cargoId) return { error: "Cargo inválido.", ok: false };

  const { data: cargo } = await supabase
    .from("cargos")
    .select("id, estado_cuenta_id, aplicaciones:pagos_aplicaciones(id)")
    .eq("id", cargoId)
    .maybeSingle();
  if (!cargo) return { error: "El cargo no existe.", ok: false };

  const c = cargo as unknown as {
    estado_cuenta_id: string | null;
    aplicaciones: { id: string }[] | null;
  };
  if (c.estado_cuenta_id) {
    return { error: "No se puede cancelar un cargo en corte.", ok: false };
  }
  if ((c.aplicaciones ?? []).length > 0) {
    return { error: "El cargo tiene pagos aplicados; no se puede cancelar.", ok: false };
  }

  const { error } = await supabase
    .from("cargos")
    .update({ estado: "cancelado" })
    .eq("id", cargoId);
  if (error) return { error: "No se pudo cancelar el cargo.", ok: false };

  revalidatePath("/maestra/cobranza");
  return { error: null, ok: true };
}
