#!/usr/bin/env node
/**
 * Human-review cleanup pass on catalog JSON.
 * - Drop garbage product names
 * - Cap absurd prices
 * - Normalize client names
 * - Prefer longest description
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = path.join(ROOT, "data/quotations");

const GARBAGE_PRODUCT =
  /^(novo item|thermal|aquecimento|contato|item|qtd|descri|foto|orçamento|cliente|local|data|cpf|valor|formas|garantia|pagamento|parcelado|à vista|a vista|serviços|nao incluso|não incluso|resumo|monofásico|condensador)/i;

const PRODUCT_OK_LOWER = /^(mão de obra|tubos|piso|manta|kit )/i;

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
}

function save(name, data) {
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(data, null, 2) + "\n");
}

const products = load("catalog.products.json");
const clients = load("catalog.clients.json");
const meta = load("catalog.meta.json");

const cleanedProducts = products
  .filter((p) => {
    if (!p.name || p.name.length < 3) return false;
    if (GARBAGE_PRODUCT.test(p.name)) return false;
    if (/^r\$/i.test(p.name)) return false;
    if (/^\d+(\.\d+)?\s*m²?$/i.test(p.name)) return false;
    // Drop pure description blobs that slipped in as names
    if (p.name.length > 110 && /potência|eficiência|dimensões/i.test(p.name)) return false;
    if (/condensador suzuki|monofásico\s+\d/i.test(p.name)) return false;
    // Glued Canva description blobs mistaken for names
    if (/[a-záéíóúç][A-ZÁÉÍÓÚ]/.test(p.name) && p.name.length > 35) return false;
    if (/estrutura metálica|mainfold aço/i.test(p.name) && /tubo a vácuo/i.test(p.name)) return false;
    if (/^[a-záéíóú]/.test(p.name) && !PRODUCT_OK_LOWER.test(p.name)) return false;
    return true;
  })
  .map((p) => {
    // Null out absurd single-item prices (> R$ 2.000.000) — likely quote totals mis-attributed
    let price = p.defaultUnitPriceCents;
    if (price != null && price > 200_000_000) {
      price = null;
    }
    // Clean description glue: drop empty / too-short
    const descriptionLines = (p.descriptionLines || [])
      .map((l) => String(l).trim())
      .filter((l) => l.length > 2 && !/^valor:/i.test(l) && !/^garantia /i.test(l));
    return {
      ...p,
      name: p.name.replace(/\s+/g, " ").trim(),
      aliases: [...new Set((p.aliases || []).map((a) => a.trim()).filter((a) => a && a !== p.name))],
      descriptionLines,
      defaultUnitPriceCents: price,
      imagePath: null,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

// Merge near-duplicates by casefold key (keep more sources / longer desc)
const byKey = new Map();
for (const p of cleanedProducts) {
  const key = p.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const prev = byKey.get(key);
  if (!prev) {
    byKey.set(key, p);
    continue;
  }
  const merged = {
    ...prev,
    aliases: [...new Set([...(prev.aliases || []), p.name, ...(p.aliases || [])].filter((a) => a !== prev.name))],
    descriptionLines:
      (p.descriptionLines?.join("") || "").length > (prev.descriptionLines?.join("") || "").length
        ? p.descriptionLines
        : prev.descriptionLines,
    defaultUnitPriceCents: p.defaultUnitPriceCents ?? prev.defaultUnitPriceCents,
    sources: [...prev.sources, ...p.sources.filter((s) => !prev.sources.some((x) => x.designId === s.designId))],
  };
  byKey.set(key, merged);
}

const finalProducts = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

const cleanedClients = clients
  .map((c) => ({
    ...c,
    name: c.name.replace(/\s+/g, " ").replace(/\.pdf$/i, "").trim(),
    locations: [...new Set((c.locations || []).map((l) => l.trim()).filter(Boolean))],
    document: c.document && !/^x+\./i.test(c.document) ? c.document : c.document,
  }))
  .filter((c) => c.name.length >= 2 && !/^grupos de produtos$/i.test(c.name) && !/^contrato /i.test(c.name))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

meta.reviewedAt = new Date().toISOString();
meta.productCount = finalProducts.length;
meta.clientCount = cleanedClients.length;
meta.notes = [
  ...(meta.notes || []),
  "Review pass: dropped garbage names, merged casefold duplicates, capped absurd prices.",
];

save("catalog.products.json", finalProducts);
save("catalog.clients.json", cleanedClients);
save("catalog.meta.json", meta);

console.log(`Reviewed: ${finalProducts.length} products, ${cleanedClients.length} clients`);
