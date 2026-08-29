export function lineTotalCents(line: { quantity: number; unitPriceCents: number }) {
  return line.quantity * line.unitPriceCents;
}

export function quotationTotalCents(lines: Array<{ quantity: number; unitPriceCents: number }>) {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number) {
  return brlFormatter.format(cents / 100);
}

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

export function splitNoteLines(raw: string | null | undefined) {
  if (!raw?.trim()) return [];
  return raw
    .split(/\n/)
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);
}

export function slugifyCatalog(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
