// Formateo de dinero en MXN para la UI mexicana.
// Regla del proyecto: montos SIEMPRE en MXN, presentados con separadores locales.

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un monto numérico como pesos mexicanos: 1234.5 -> "$1,234.50". */
export function formatMXN(monto: number): string {
  return MXN.format(monto);
}

/** Formatea un entero de centavos como MXN: 123450 -> "$1,234.50". */
export function formatCentavosMXN(centavos: number): string {
  return MXN.format(centavos / 100);
}
