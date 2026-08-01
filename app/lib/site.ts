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

export function whatsappHref(message: string) {
  return `${CONTACT.whatsappUrl}?text=${encodeURIComponent(message)}`;
}
