"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  cancelarCargo,
  type CobranzaState,
} from "@/lib/data/cobranza-actions";
import type { CargoFila } from "@/types/domain";
import { formatMXN } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ESTADO_LABEL,
  ESTADO_VARIANT,
  ORIGEN_LABEL,
} from "./cobranza-shared";

const initialState: CobranzaState = { error: null, ok: false };

function CancelarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-alerta hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Cancelar"}
    </button>
  );
}

function AccionesCargo({ cargo }: { cargo: CargoFila }) {
  const [state, formAction] = useFormState(cancelarCargo, initialState);
  // Solo se puede cancelar si no está pagado/en corte/cancelado y sin abonos.
  const cancelable =
    cargo.saldo > 0 &&
    cargo.estado !== "en_corte" &&
    cargo.estado !== "cancelado" &&
    cargo.saldo === cargo.monto;
  if (!cancelable) return <span className="text-xs text-filo">—</span>;
  return (
    <form action={formAction}>
      <input type="hidden" name="cargo_id" value={cargo.id} />
      <CancelarButton />
      {state.error ? (
        <span className="ml-2 text-xs text-alerta">{state.error}</span>
      ) : null}
    </form>
  );
}

export function CobranzaTabla({ cargos }: { cargos: CargoFila[] }) {
  if (cargos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-filo">
        No hay cargos que coincidan con los filtros.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Alumna</TableHead>
          <TableHead>Concepto</TableHead>
          <TableHead>Periodo</TableHead>
          <TableHead>Origen</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead className="text-right">Saldo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cargos.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium text-tinta">{c.alumna}</TableCell>
            <TableCell>{c.concepto}</TableCell>
            <TableCell>{c.periodo ?? "—"}</TableCell>
            <TableCell>{ORIGEN_LABEL[c.origen]}</TableCell>
            <TableCell className="money text-right">
              {formatMXN(c.monto)}
            </TableCell>
            <TableCell className="money text-right">
              {formatMXN(c.saldo)}
            </TableCell>
            <TableCell>
              <Badge variant={ESTADO_VARIANT[c.estado]}>
                {ESTADO_LABEL[c.estado]}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <AccionesCargo cargo={c} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
