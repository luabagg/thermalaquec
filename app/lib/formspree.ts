export const FORM_KINDS = ["contact", "calculator"] as const;

export type FormKind = (typeof FORM_KINDS)[number];

/** Public Formspree endpoints (same IDs Formspree embeds in client forms). */
export const FORMSPREE_ENDPOINTS: Record<FormKind, string> = {
  contact: "https://formspree.io/f/xzdnladq",
  calculator: "https://formspree.io/f/xgogjlaw",
};

export function isFormKind(value: string): value is FormKind {
  return (FORM_KINDS as readonly string[]).includes(value);
}
