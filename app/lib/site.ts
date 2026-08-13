export const SITE_URL = "https://thermalaquec.com.br";

export const SITE_NAME = "Thermal Aquecimento";

export const SITE_SHORT_NAME = "Thermal";

export const SITE_DESCRIPTION =
  "Aquecimento central e energia solar com engenharia própria. Projetos para residências, comércios e indústrias no Rio Grande do Sul.";

export const CONTACT = {
  email: "contato@thermalaquec.com.br",
  phoneDisplay: "(54) 99155-3618",
  phoneE164: "5554991553618",
  whatsappUrl: "https://wa.me/5554991553618",
  addressLine: "Rua Paulo Tartarotti, 1012 - Bela Vista",
  cityLine: "Farroupilha/RS, 95173-148",
  address: {
    streetAddress: "Rua Paulo Tartarotti, 1012 - Bela Vista",
    addressLocality: "Farroupilha",
    addressRegion: "RS",
    postalCode: "95173-148",
    addressCountry: "BR",
  },
} as const;

/** Only publish networks that actually exist. */
export const SOCIAL = {
  instagram: "https://www.instagram.com/_thermalaq",
} as const;

export const FORMSPREE = {
  contact: "https://formspree.io/f/xzdnladq",
  calculator: "https://formspree.io/f/xgogjlaw",
} as const;

export const GTM_ID = "GTM-KCMFZQ6Q";

/** Matches site nav (`bg-ink-soft`). Used for quote logo + table header. */
export const QUOTE_NAV_GREY = "#1F1F1F";

/** Quote title + footer accent. */
export const QUOTE_ACCENT = "#d55711";

/** Company block used on printable orçamentos (Canva template). */
export const QUOTE_COMPANY = {
  legalName: "Thermal Aquecimento LTDA",
  taxRegime: "Empresa simples nacional",
  cnpj: "43.706.051/0001-46",
} as const;

export type QuoteRepProfile = {
  brandPerson: string;
  phone: string;
  city: string;
  email: string;
};

/** Salesperson branding on orçamentos — keyed by logged-in admin email. */
export const QUOTE_REPS = {
  lucas: {
    brandPerson: "Lucas Baggio",
    phone: "54 996161816",
    city: "Bento Gonçalves",
    email: "lucas@thermalaquec.com.br",
  },
  jiovani: {
    brandPerson: "Jiovani Rafael",
    phone: "(54) 99155-3618",
    city: "Farroupilha/RS, 95173-148",
    email: "contato@thermalaquec.com.br",
  },
} as const satisfies Record<string, QuoteRepProfile>;

export function resolveQuoteRep(email: string | null | undefined): QuoteRepProfile {
  const normalized = (email ?? "").trim().toLowerCase();
  if (normalized === "lucas@thermalaquec.com.br") return QUOTE_REPS.lucas;
  if (normalized === "jiovani@thermalaquec.com.br" || normalized === "contato@thermalaquec.com.br") {
    return QUOTE_REPS.jiovani;
  }
  return QUOTE_REPS.jiovani;
}

export function whatsappHref(message: string) {
  return `${CONTACT.whatsappUrl}?text=${encodeURIComponent(message)}`;
}
