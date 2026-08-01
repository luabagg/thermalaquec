export const SITE_URL = "https://thermalaquecimento.com.br";

export const SITE_NAME = "Thermal";

export const SITE_DESCRIPTION =
  "Soluções completas e de alta qualidade em energia solar e aquecimento industrial. Projetos personalizados para residências, comércios e indústrias.";

export const CONTACT = {
  email: "contato@thermalaquecimento.com.br",
  phoneDisplay: "(54) 99155-3618",
  phoneE164: "5554991553618",
  whatsappUrl: "https://wa.me/5554991553618",
  addressLine: "Rua Paulo Tartarotti, 1012 — Bela Vista",
  cityLine: "Farroupilha/RS, 95173-148",
} as const;

export const SOCIAL = {
  facebook: "https://www.facebook.com/thermalengenharia",
  instagram: "https://www.instagram.com/_thermaleng",
  linkedin: "https://www.linkedin.com/company/thermal-engenharia",
} as const;

export const FORMSPREE = {
  contact: "https://formspree.io/f/xpwyojoa",
  calculator: "https://formspree.io/f/mgvndobe",
} as const;

export const GTM_ID = "GTM-KCMFZQ6Q";

export function whatsappHref(message: string) {
  return `${CONTACT.whatsappUrl}?text=${encodeURIComponent(message)}`;
}
