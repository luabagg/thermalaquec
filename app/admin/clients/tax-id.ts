// A tax id is a CPF (11 digits) or a CNPJ (14 characters). Since 2026 the first 12 CNPJ characters can be
// letters. It is stored compact: uppercase, without punctuation.

export type TaxIdKind = "cpf" | "cnpj";

const ALPHANUM = /[A-Z0-9]/;

/** Compact tax id: at most 14 characters. The first 12 are A-Z or 0-9; the two check digits are numeric. */
export function compactTaxId(raw: string) {
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
  const compact = compactTaxId(raw ?? "");
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

/** "529.982.247-25", as far as it is typed. */
function formatCpf(compact: string) {
  const a = compact.slice(0, 3);
  const b = compact.slice(3, 6);
  const c = compact.slice(6, 9);
  const d = compact.slice(9, 11);
  if (compact.length <= 3) return a;
  if (compact.length <= 6) return `${a}.${b}`;
  if (compact.length <= 9) return `${a}.${b}.${c}`;
  return `${a}.${b}.${c}-${d}`;
}

/** "11.222.333/0001-81", as far as it is typed. */
function formatCnpj(compact: string) {
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

/** Punctuates a tax id as far as it is typed. */
export function formatTaxId(raw: string | null | undefined) {
  const compact = compactTaxId(raw ?? "");
  if (!compact) return "";
  return classifyTaxId(compact) === "cpf" ? formatCpf(compact) : formatCnpj(compact);
}

/** The caret position in `formatted` right after its first `alphanumCount` tax id characters. */
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

function checkDigit(values: number[], weights: number[]) {
  const sum = values.reduce((total, value, index) => total + value * weights[index], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** CPF: 11 digits with two mod-11 check digits. */
function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = [...cpf].map(Number);
  const first = checkDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits[9] === first && digits[10] === second;
}

/** CNPJ, numeric or alphanumeric (Receita Federal, 2026): characters count as their ASCII code minus 48. */
function isValidCnpj(cnpj: string) {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const values = [...cnpj].map((char) => char.charCodeAt(0) - 48);
  const first = checkDigit(values.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(values.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return values[12] === first && values[13] === second;
}

/** Checks the check digits of a compact tax id. */
export function isValidTaxId(compact: string) {
  return compact.length === 11 ? isValidCpf(compact) : isValidCnpj(compact);
}
