import { digitsOnly } from "./client-display";
import { compactTaxId, isValidTaxId } from "./tax-id";

export const BRAZIL_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

/** What a client record says: the client form submits it and `createClient` / `updateClient` store it. */
export type ClientContent = {
  name: string;
  /** CPF or CNPJ, compact. */
  taxId: string | null;
  /** Digits with area code. */
  phone: string | null;
  email: string | null;
  /** CEP, digits only. */
  postalCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string;
  /** UF, two uppercase letters. */
  state: string;
  notes: string | null;
};

/** A client field. It is also the name of that field's input in every client form. */
export type ClientField = keyof ClientContent;

/** Why a client form did not save: per-field messages, or one message for the whole form. */
export type ClientFormErrors = { fieldErrors?: Partial<Record<ClientField, string>>; formError?: string };

export type ClientForm = { ok: true; content: ClientContent } | { ok: false; errors: ClientFormErrors };

export const STALE_CLIENT_FORM_MESSAGE = "Esta página está desatualizada. Recarregue a página e salve de novo.";

// Text inputs and the textarea submit even when empty. The state select submits nothing while it shows its
// disabled placeholder, so it is left out.
const ALWAYS_SUBMITTED: ClientField[] = [
  "name", "taxId", "phone", "email", "postalCode", "street", "number", "complement", "district", "city", "notes",
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Digits with area code. A leading Brazil country code (+55) is dropped. */
function nationalPhone(raw: string) {
  const digits = digitsOnly(raw);
  return /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
}

/** Reads the fields and stores tax ids, phones and CEPs without punctuation. */
function readClientContent(form: FormData): ClientContent {
  const text = (field: ClientField) => String(form.get(field) ?? "").trim();
  return {
    name: text("name"),
    taxId: compactTaxId(text("taxId")) || null,
    phone: nationalPhone(text("phone")) || null,
    email: text("email") || null,
    postalCode: digitsOnly(text("postalCode")) || null,
    street: text("street") || null,
    number: text("number") || null,
    complement: text("complement") || null,
    district: text("district") || null,
    city: text("city"),
    state: text("state").toUpperCase(),
    notes: text("notes") || null,
  };
}

type ClientRule = { field: ClientField; message: string; fails(content: ClientContent): boolean };

/** Only the name, city and state are required. The optional fields must be valid when filled. */
const CLIENT_RULES: ClientRule[] = [
  { field: "name", message: "Informe o nome.", fails: (content) => !content.name },
  { field: "city", message: "Informe a cidade.", fails: (content) => !content.city },
  { field: "state", message: "Selecione o estado.", fails: (content) => !(BRAZIL_STATES as readonly string[]).includes(content.state) },
  { field: "taxId", message: "CPF ou CNPJ inválido.", fails: (content) => content.taxId !== null && !isValidTaxId(content.taxId) },
  {
    field: "phone",
    message: "Use DDD e número, com 10 ou 11 dígitos.",
    fails: (content) => content.phone !== null && !/^\d{10,11}$/.test(content.phone),
  },
  { field: "postalCode", message: "O CEP tem 8 dígitos.", fails: (content) => content.postalCode !== null && content.postalCode.length !== 8 },
  { field: "email", message: "E-mail inválido.", fails: (content) => content.email !== null && !EMAIL.test(content.email) },
];

/**
 * Reads and validates the client form. A form without one of its fields comes from a page loaded before its
 * fields were renamed; saving it would erase that field, so it is refused.
 */
export function parseClientForm(form: FormData): ClientForm {
  if (ALWAYS_SUBMITTED.some((field) => !form.has(field))) return { ok: false, errors: { formError: STALE_CLIENT_FORM_MESSAGE } };
  const content = readClientContent(form);
  const fieldErrors: Partial<Record<ClientField, string>> = {};
  for (const rule of CLIENT_RULES) {
    if (rule.fails(content)) fieldErrors[rule.field] = rule.message;
  }
  return Object.keys(fieldErrors).length > 0 ? { ok: false, errors: { fieldErrors } } : { ok: true, content };
}
