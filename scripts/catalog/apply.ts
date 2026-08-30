// Replaces the whole catalog with the families in data/catalog/families.json.
// Destructive by design: the old flat rows and the normalization ledger are removed.
import { readFileSync } from "node:fs";

import prisma from "~/libs/prisma/client.server";
import { catalogVariantKey } from "~/utils/catalog-resolver";
import { slugifyCatalog } from "~/utils/quotation";

type Member = {
  id: number;
  name: string;
  normalizedName: string;
  price: number | null;
  attributes: { option: string; value: string }[];
};
type Family = {
  name: string;
  line: string;
  brand: string | null;
  options: { name: string; values: string[] }[];
  members: Member[];
};

const OPTION_ORDER = [
  "Capacidade", "Potência", "Pressão", "Material", "Tensão", "Temperatura",
  "Área", "Tubos", "Elementos", "Vias", "Bitola", "Dimensão", "Nível", "Medida", "Modelo",
];
const DEFAULT_VALUE = "Padrão";

/** "1.000L" must sort after "800L", so compare the leading number when there is one. */
function compareValues(left: string, right: string) {
  if (left === DEFAULT_VALUE) return 1;
  if (right === DEFAULT_VALUE) return -1;
  const numberOf = (label: string) => {
    const match = /^(\d[\d.]*(?:,\d+)?)/.exec(label);
    return match ? Number(match[1].replace(/\./g, "").replace(",", ".")) : Number.NaN;
  };
  const [a, b] = [numberOf(left), numberOf(right)];
  if (!Number.isNaN(a) && !Number.isNaN(b) && a !== b) return a - b;
  return left.localeCompare(right, "pt-BR");
}

type PlannedOption = { name: string; values: string[] };
type Plan = {
  family: Family;
  merged: boolean;
  options: PlannedOption[];
  data: {
    slug: string; name: string; nameTemplate: null;
    descriptionLines: string[]; defaultUnitPriceCents: number | null;
  };
  itemId: number;
};

const families = JSON.parse(readFileSync("data/catalog/families.json", "utf8")) as Family[];
const products = JSON.parse(readFileSync("data/catalog/products.json", "utf8")) as {
  id: number; descriptionLines: string[];
}[];
const descriptionById = new Map(products.map((product) => [product.id, product.descriptionLines ?? []]));

/** Lowercase a word so "Inox 316" reads as "inox 316" in a generated name, but leave codes alone. */
const titleFragment = (label: string) =>
  /^[A-ZÀ-Ý][a-zà-ÿ]/.test(label) ? label[0].toLocaleLowerCase("pt-BR") + label.slice(1) : label;

const usedSlugs = new Set<string>();
function uniqueSlug(name: string) {
  const base = slugifyCatalog(name) || "produto";
  let slug = base;
  for (let suffix = 2; usedSlugs.has(slug); suffix += 1) slug = `${base.slice(0, 74)}-${suffix}`;
  usedSlugs.add(slug);
  return slug;
}

// Options a merged family needs, in a stable order, with a fallback value when a member lacks one.
function planOptions(family: Family) {
  const byName = new Map<string, Set<string>>();
  for (const member of family.members) {
    for (const attribute of member.attributes) {
      const values = byName.get(attribute.option) ?? new Set<string>();
      values.add(attribute.value);
      byName.set(attribute.option, values);
    }
  }
  return [...byName]
    .sort((a, b) => OPTION_ORDER.indexOf(a[0]) - OPTION_ORDER.indexOf(b[0]))
    .map(([name, values]) => {
      // A member without this attribute still needs a value, or the resolver rejects the variant.
      const incomplete = family.members.some(
        (member) => !member.attributes.some((attribute) => attribute.option === name),
      );
      const labels = [...values].sort(compareValues);
      return { name, values: incomplete ? [...labels, DEFAULT_VALUE] : labels };
    });
}

async function main() {
  const summary = await prisma.$transaction(async (tx) => {
    // Order matters: every relation below restricts deletion of what it points at.
    const removedLines = await tx.quotationLine.deleteMany({});
    await tx.quoteCatalogVariantValue.deleteMany({});
    await tx.quoteCatalogVariant.deleteMany({});
    await tx.quoteCatalogOptionValue.deleteMany({});
    await tx.quoteCatalogOption.deleteMany({});
    const removedItems = await tx.quoteCatalogItem.deleteMany({});

    const plans: Plan[] = families.map((family) => {
      const merged = family.members.length > 1;
      const options = merged ? planOptions(family) : [];
      const only = family.members[0];
      return {
        family,
        merged,
        options,
        data: {
          slug: uniqueSlug(merged ? family.name : only.normalizedName),
          name: merged ? family.name : only.normalizedName,
          nameTemplate: null,
          descriptionLines: merged ? [] : descriptionById.get(only.id) ?? [],
          defaultUnitPriceCents: merged ? null : only.price,
        },
        itemId: 0,
      };
    });

    const items = await tx.quoteCatalogItem.createManyAndReturn({
      data: plans.map((plan) => plan.data),
      select: { id: true, slug: true },
    });
    const itemIdBySlug = new Map(items.map((item) => [item.slug, item.id]));
    for (const plan of plans) {
      const itemId = itemIdBySlug.get(plan.data.slug);
      if (itemId === undefined) throw new Error(`Family ${plan.data.slug} was not created`);
      plan.itemId = itemId;
    }

    const optionId = (plan: Plan, option: PlannedOption) => {
      const id = optionIdByKey.get(`${plan.itemId}:${slugifyCatalog(option.name)}`);
      if (id === undefined) throw new Error(`Option ${option.name} of ${plan.data.slug} was not created`);
      return id;
    };

    const optionRows = await tx.quoteCatalogOption.createManyAndReturn({
      data: plans.flatMap((plan) =>
        plan.options.map((option, index) => ({
          catalogItemId: plan.itemId,
          name: option.name,
          slug: slugifyCatalog(option.name),
          placement: "TITLE" as const,
          sortOrder: index,
        })),
      ),
      select: { id: true, catalogItemId: true, slug: true },
    });
    const optionIdByKey = new Map(optionRows.map((row) => [`${row.catalogItemId}:${row.slug}`, row.id]));

    const valueRows = await tx.quoteCatalogOptionValue.createManyAndReturn({
      data: plans.flatMap((plan) =>
        plan.options.flatMap((option) =>
          option.values.map((label, index) => ({
            optionId: optionId(plan, option),
            label,
            slug: slugifyCatalog(label) || `valor-${index}`,
            titleFragment: label === DEFAULT_VALUE ? "" : titleFragment(label),
            descriptionLines: [],
            sortOrder: index,
          })),
        ),
      ),
      select: { id: true, optionId: true, slug: true },
    });
    const valueIdByKey = new Map(valueRows.map((row) => [`${row.optionId}:${row.slug}`, row.id]));

    const variantPlans: { itemId: number; key: string; valueIds: number[]; member: Member }[] = [];
    for (const plan of plans) {
      // A generic family collapses rows that carry no axis, so it stays a plain product.
      if (!plan.merged || !plan.options.length) continue;
      const seen = new Set<string>();
      for (const member of plan.family.members) {
        const valueIds = plan.options.map((option) => {
          const label = member.attributes.find((attribute) => attribute.option === option.name)?.value ?? DEFAULT_VALUE;
          const valueId = valueIdByKey.get(`${optionId(plan, option)}:${slugifyCatalog(label) || "valor-0"}`);
          if (valueId === undefined) throw new Error(`Value ${label} of ${plan.data.slug} was not created`);
          return valueId;
        });
        const key = catalogVariantKey(valueIds);
        if (seen.has(key)) continue;
        seen.add(key);
        variantPlans.push({ itemId: plan.itemId, key, valueIds, member });
      }
    }

    const variantRows = await tx.quoteCatalogVariant.createManyAndReturn({
      data: variantPlans.map((variant) => ({
        catalogItemId: variant.itemId,
        key: variant.key,
        active: true,
        nameOverride: null,
        descriptionLinesOverride: descriptionById.get(variant.member.id)?.length
          ? descriptionById.get(variant.member.id)
          : undefined,
        unitPriceCents: variant.member.price,
      })),
      select: { id: true, catalogItemId: true, key: true },
    });
    const variantIdByKey = new Map(variantRows.map((row) => [`${row.catalogItemId}:${row.key}`, row.id]));

    await tx.quoteCatalogVariantValue.createMany({
      data: variantPlans.flatMap((variant) => {
        const variantId = variantIdByKey.get(`${variant.itemId}:${variant.key}`);
        if (variantId === undefined) throw new Error(`Variant ${variant.key} was not created`);
        return variant.valueIds.map((optionValueId) => ({ variantId, optionValueId }));
      }),
    });

    return {
      removedQuotationLines: removedLines.count,
      removedCatalogItems: removedItems.count,
      families: items.length,
      options: optionRows.length,
      values: valueRows.length,
      variants: variantRows.length,
    };
  }, { maxWait: 20_000, timeout: 120_000 });

  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

await main();
