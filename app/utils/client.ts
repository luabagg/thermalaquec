import { formatTaxId, stripTaxId } from "~/utils/tax-id";

export const BRAZIL_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export type ClientInput = {
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  postalCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string;
  state: string;
  notes: string | null;
};

export type ClientField = keyof ClientInput;

export type ClientParseResult =
  | { ok: true; data: ClientInput }
  | { ok: false; fieldErrors: Partial<Record<ClientField, string>> };

const digitsOnly = (value: string) => value.replace(/\D/g, "");

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

export function isValidTaxId(compact: string) {
  return compact.length === 11 ? isValidCpf(compact) : isValidCnpj(compact);
}

function optionalText(form: FormData, field: ClientField) {
  const value = String(form.get(field) ?? "").trim();
  return value || null;
}

/** Reads and validates the client form. Stores documents, phones and CEPs without punctuation. */
export function parseClientForm(form: FormData): ClientParseResult {
  const fieldErrors: Partial<Record<ClientField, string>> = {};
  const name = String(form.get("name") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const state = String(form.get("state") ?? "").trim().toUpperCase();
  const document = stripTaxId(String(form.get("document") ?? "")) || null;
  const phone = digitsOnly(String(form.get("phone") ?? "")) || null;
  const postalCode = digitsOnly(String(form.get("postalCode") ?? "")) || null;
  const email = optionalText(form, "email");

  if (!name) fieldErrors.name = "Informe o nome.";
  if (!city) fieldErrors.city = "Informe a cidade.";
  if (!(BRAZIL_STATES as readonly string[]).includes(state)) fieldErrors.state = "Selecione o estado.";
  if (document && !isValidTaxId(document)) fieldErrors.document = "CPF ou CNPJ inválido.";
  if (phone && !/^\d{10,11}$/.test(phone)) fieldErrors.phone = "Use DDD e número, com 10 ou 11 dígitos.";
  if (postalCode && postalCode.length !== 8) fieldErrors.postalCode = "O CEP tem 8 dígitos.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "E-mail inválido.";

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: {
      name,
      document,
      phone,
      email,
      postalCode,
      street: optionalText(form, "street"),
      number: optionalText(form, "number"),
      complement: optionalText(form, "complement"),
      district: optionalText(form, "district"),
      city,
      state,
      notes: optionalText(form, "notes"),
    },
  };
}

export function formatPhone(phone: string | null | undefined) {
  const digits = digitsOnly(phone ?? "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

export function formatPostalCode(postalCode: string | null | undefined) {
  const digits = digitsOnly(postalCode ?? "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

type ClientAddress = Pick<ClientInput, "street" | "number" | "complement" | "district" | "city" | "state">;

/** "Farroupilha/RS". */
export function formatCityState(client: Pick<ClientAddress, "city" | "state">) {
  return `${client.city}/${client.state}`;
}

/** "Rua X, 123, ap 2 - Centro, Farroupilha/RS", leaving out the parts that are empty. */
export function formatClientAddress(client: ClientAddress) {
  const streetLine = [client.street, client.number, client.complement].filter(Boolean).join(", ");
  const place = [client.district, formatCityState(client)].filter(Boolean).join(", ");
  return streetLine ? `${streetLine} - ${place}` : place;
}

export { formatTaxId };
