import type { CatalogListStatus, CatalogProductInput } from "~/models/catalog.server";
import { attributeList } from "~/utils/catalog-picker";
import { parseBRLToCents } from "~/utils/quotation";
import { splitBullets } from "~/utils/quotation-form";

export const STALE_CATALOG_MESSAGE = "Este produto foi alterado em outra aba. Recarregue e tente novamente.";

export function parseCatalogStatus(value: string | null): CatalogListStatus {
  return value === "archived" || value === "all" ? value : "active";
}

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function positiveId(form: FormData, key: string) {
  const id = Number(text(form, key));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** "Capacidade: 400L" per line. A line without a colon is ignored. */
export function parseAttributes(raw: string) {
  return raw.split(/\n/).flatMap((line) => {
    const colon = line.indexOf(":");
    const name = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    return colon > 0 && name && value ? [{ name, value }] : [];
  });
}

export function formatAttributes(value: unknown) {
  return attributeList(value)
    .map((attribute) => `${attribute.name}: ${attribute.value}`)
    .join("\n");
}

/** An empty price means "no catalog price": the quotation line starts at zero. */
function optionalPrice(raw: string) {
  return raw ? parseBRLToCents(raw) : null;
}

export type CatalogProductForm =
  | { ok: true; expectedUpdatedAt: Date; input: CatalogProductInput }
  | { ok: false; error: string };

export function parseCatalogProductForm(form: FormData): CatalogProductForm {
  const expectedUpdatedAt = new Date(text(form, "expectedUpdatedAt"));
  if (Number.isNaN(expectedUpdatedAt.valueOf())) return { ok: false, error: STALE_CATALOG_MESSAGE };
  const name = text(form, "name");
  if (!name) return { ok: false, error: "Informe o nome do produto." };

  const variants: CatalogProductInput["variants"] = [];
  for (let i = 0; i < Number(text(form, "variantCount")); i++) {
    const variantName = text(form, `variant.${i}.name`);
    if (!variantName) return { ok: false, error: `Informe o nome da variante ${i + 1}.` };
    const priceRaw = text(form, `variant.${i}.price`);
    const priceCents = optionalPrice(priceRaw);
    if (priceRaw && priceCents === null) return { ok: false, error: `Preço inválido na variante ${i + 1}.` };
    variants.push({
      id: positiveId(form, `variant.${i}.id`),
      name: variantName,
      attributes: parseAttributes(String(form.get(`variant.${i}.attributes`) ?? "")),
      descriptionLines: splitBullets(String(form.get(`variant.${i}.description`) ?? "")),
      priceCents,
      imageId: positiveId(form, `variant.${i}.imageId`),
      active: form.get(`variant.${i}.active`) === "on",
    });
  }
  if (variants.length === 0) return { ok: false, error: "O produto precisa de pelo menos uma variante." };

  return {
    ok: true,
    expectedUpdatedAt,
    input: {
      name,
      brand: text(form, "brand") || null,
      categoryId: positiveId(form, "categoryId"),
      descriptionLines: splitBullets(String(form.get("description") ?? "")),
      imageId: positiveId(form, "imageId"),
      variants,
    },
  };
}
