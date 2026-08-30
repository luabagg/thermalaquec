// Groups the flat products into families. Pure: reads products.json, writes families.json.
import { readFileSync, writeFileSync } from "node:fs";
import { fold, parseProductName } from "./parse-names.mjs";
import { HEAD_NOUNS, LINE_QUALIFIERS } from "./lines.mjs";
import { DROP, GENERIC, NAME_FIXES } from "./overrides.mjs";

const raw = JSON.parse(readFileSync("data/catalog/products.json", "utf8"));
const fixByName = new Map(NAME_FIXES.map((fix) => [fix.from, fix.to]));

const dropped = raw.filter((product) => DROP.some((rule) => rule.match.test(product.name)));
const products = raw
  .filter((product) => !dropped.includes(product))
  .map((product) => {
    const generic = GENERIC.find((rule) => rule.match.test(product.name.trim()));
    return {
      ...product,
      originalName: product.name,
      generic: generic?.name ?? null,
      name: generic?.name ?? fixByName.get(product.name) ?? product.name,
    };
  });

function productLine(rawName, phrase) {
  const tokens = phrase.split(/\s+/).filter(Boolean);
  const head = HEAD_NOUNS.get(fold(tokens[0] ?? "")) ?? tokens[0] ?? "Sem categoria";
  const qualifier = LINE_QUALIFIERS.find((entry) => entry.match.test(rawName));
  return qualifier ? `${head} ${qualifier.label}` : head;
}

const families = new Map();
for (const product of products) {
  const parsed = parseProductName(product.name);
  const line = productLine(product.name, parsed.phrase);
  // A generic row is keyed by its own name so it never mixes with the specific
  // products that share its head noun, such as "Cabos Calefatores".
  const key = product.generic ? `generic:${fold(product.generic)}` : `${fold(line)}|${parsed.brand ?? ""}`;
  const family = families.get(key) ?? {
    key,
    line: product.generic ?? line,
    brand: product.generic ? null : parsed.brand,
    name: product.generic ?? (parsed.brand ? `${line} ${parsed.brand}` : line),
    generic: Boolean(product.generic),
    members: [],
  };
  family.members.push({
    id: product.id,
    name: product.originalName,
    normalizedName: product.name,
    generic: product.generic,
    price: product.defaultUnitPriceCents,
    parsed,
  });
  families.set(key, family);
}

// A family needs a real shared axis. Members that differ only by free text are
// separate products, not variants: a "Kit de chamine" is not a variant of a "Kit de radiador".
const STRUCTURED = new Set(["Capacidade", "Potência", "Pressão", "Material", "Tensão", "Temperatura", "Nível", "Medida", "Área", "Tubos", "Elementos", "Vias", "Bitola", "Dimensão"]);

const grouped = [];
for (const family of families.values()) {
  const structuredValues = new Map();
  for (const member of family.members) {
    for (const attribute of member.parsed.attributes) {
      if (!STRUCTURED.has(attribute.option)) continue;
      const values = structuredValues.get(attribute.option) ?? new Set();
      values.add(attribute.value);
      structuredValues.set(attribute.option, values);
    }
  }
  const varies = [...structuredValues.values()].some((values) => values.size > 1);
  // A generic override deliberately collapses its rows, so it never splits back apart.
  if (family.members.length === 1 || varies || family.generic) {
    grouped.push(family);
    continue;
  }
  for (const member of family.members) {
    grouped.push({ ...family, key: `${family.key}|${member.id}`, name: member.name, members: [member], split: true });
  }
}

const list = grouped.sort((a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name));
for (const family of list) {
  const options = new Map();
  for (const member of family.members) {
    const attributes = [...member.parsed.attributes];
    // Whatever the rules could not name becomes the Modelo axis, so nothing is silently dropped.
    const leftover = member.parsed.phrase
      .split(/\s+/)
      .filter((token) => !fold(family.line).includes(fold(token)))
      .concat(member.parsed.model)
      .join(" ")
      .trim();
    if (leftover) attributes.push({ option: "Modelo", value: leftover });
    member.attributes = attributes;
    for (const attribute of attributes) {
      const values = options.get(attribute.option) ?? new Set();
      values.add(attribute.value);
      options.set(attribute.option, values);
    }
  }
  family.options = [...options]
    .map(([name, values]) => ({ name, values: [...values].sort() }))
    .filter((option) => option.values.length > 1 || family.members.length === 1);
}

writeFileSync("data/catalog/families.json", `${JSON.stringify(list, null, 2)}\n`);
writeFileSync("data/catalog/dropped.json", `${JSON.stringify(dropped, null, 2)}\n`);
const merged = list.filter((family) => family.members.length > 1);
console.log(`dropped ${dropped.length} rows: ${dropped.map((d) => d.name).join(" | ")}`);
console.log(`products ${raw.length} - ${dropped.length}  ->  families ${list.length}`);
console.log(`merging 2+ products: ${merged.length}   single-product families: ${list.length - merged.length}`);
console.log(`largest: ${list.slice(0, 8).map((f) => `${f.name} (${f.members.length})`).join(", ")}`);
