export type TaxIdKind = "cpf" | "cnpj";

const ALPHANUM = /[A-Z0-9]/;

/** Compact tax id: max 14 chars. First 12 A–Z/0–9; check digits numeric only. */
export function stripTaxId(raw: string) {
  const chars: string[] = [];
  for (const ch of raw.toUpperCase()) {
    if (chars.length >= 14) break;
    if (chars.length >= 12) {
      if (/[0-9]/.test(ch)) chars.push(ch);
      continue;
    }
    if (ALPHANUM.test(ch)) chars.push(ch);
  }
  return chars.join("");
}

export function classifyTaxId(raw: string | null | undefined): TaxIdKind | null {
  const compact = stripTaxId(raw ?? "");
  if (!compact) return null;
  if (/[A-Z]/.test(compact) || compact.length > 11) return "cnpj";
  return "cpf";
}

export function taxIdLabel(raw: string | null | undefined): "CPF" | "CNPJ" | "CPF/CNPJ" {
  const kind = classifyTaxId(raw);
  if (kind === "cpf") return "CPF";
  if (kind === "cnpj") return "CNPJ";
  return "CPF/CNPJ";
}

export function formatTaxId(raw: string | null | undefined) {
  const compact = stripTaxId(raw ?? "");
  if (!compact) return "";

  if (classifyTaxId(compact) === "cpf") {
    const a = compact.slice(0, 3);
    const b = compact.slice(3, 6);
    const c = compact.slice(6, 9);
    const d = compact.slice(9, 11);
    if (compact.length <= 3) return a;
    if (compact.length <= 6) return `${a}.${b}`;
    if (compact.length <= 9) return `${a}.${b}.${c}`;
    return `${a}.${b}.${c}-${d}`;
  }

  const a = compact.slice(0, 2);
  const b = compact.slice(2, 5);
  const c = compact.slice(5, 8);
  const d = compact.slice(8, 12);
  const e = compact.slice(12, 14);
  if (compact.length <= 2) return a;
  if (compact.length <= 5) return `${a}.${b}`;
  if (compact.length <= 8) return `${a}.${b}.${c}`;
  if (compact.length <= 12) return `${a}.${b}.${c}/${d}`;
  return `${a}.${b}.${c}/${d}-${e}`;
}

export function caretAfterTaxIdChars(formatted: string, alphanumCount: number) {
  if (alphanumCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (ALPHANUM.test(formatted[i].toUpperCase())) {
      seen += 1;
      if (seen === alphanumCount) return i + 1;
    }
  }
  return formatted.length;
}
