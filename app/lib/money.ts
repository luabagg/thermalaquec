const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number) {
  return brlFormatter.format(cents / 100);
}

/** Reads an amount typed as "1.234,56", "1234,56" or "1234.56". */
export function parseBRLToCents(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** The value a price input shows for an amount: "1234,56". */
export function centsToInputText(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
