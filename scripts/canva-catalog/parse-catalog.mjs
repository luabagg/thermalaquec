#!/usr/bin/env node
/**
 * Heuristic Canva quotation text → catalog.products.json + catalog.clients.json
 *
 * Usage: node scripts/canva-catalog/parse-catalog.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const DATA = path.join(ROOT, "data/quotations");
const RAW = path.join(DATA, "raw");
const CONTENTS = path.join(RAW, "contents");

const SKIP_TITLE_PREFIXES = ["contrato ", "copy of ", "grupos de produtos", "grupos de produto"];
const NOISE_LINES = new Set([
  "item",
  "qtd.",
  "qtd",
  "descrição",
  "descricao",
  "foto",
  "orçamento",
  "orcamento",
  "cliente",
  "local",
  "cidade",
  "prazo",
  "data",
  "cpf",
  "cnpj",
  "thermal",
  "aquecimento",
  "lucas baggio",
  "valor total:",
  "valor total",
  "formas de pagamento:",
  "formas de pagamento",
  "serviços:",
  "servicos:",
]);

const PRODUCT_NAME_HINTS =
  /^(boiler|bomba|caldeira|radiador|trocador|termostato|válvula|valvula|lareira|placa|geradora|aquecedor|pressurizador|controlador|quadro|tubo|manta|piso|módulo|modulo|inversor|fan\s?coil|fancoil|kit|duto|cano|resistência|resistencia|vaso|difusor|otimizador|grelha|grades|acumulador|mão de obra|mao de obra|tubos|cabos|reservatório|reservatorio|contatora|caixas|dutos|pressostato|malha|tanque|filtro|disjuntor|ventilador|queimador|design inverter|mainfold|estrutura|luva|sistema|interligação|interligacao|retirada|otimizador)/i;

function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeName(name) {
  return name.replace(/\s+/g, " ").trim();
}

function casefoldKey(name) {
  return normalizeName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseBrlToCents(text) {
  // Brazilian with thousand dots: 146.660,00 or 6.800,00
  let m = text.match(/R\$\s*(\d{1,3}(?:\.\d{3})+,\d{2})/);
  if (m) {
    const n = Number(m[1].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  // Plain Brazilian without thousands: 8000,00
  m = text.match(/R\$\s*(\d+,\d{2})(?!\d)/);
  if (m) {
    const n = Number(m[1].replace(",", "."));
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  // Mistaken US thousands + cents: 6,800,00
  m = text.match(/R\$\s*(\d{1,3}(?:,\d{3})+,\d{2})/);
  if (m) {
    const raw = m[1];
    const lastComma = raw.lastIndexOf(",");
    const n = Number(raw.slice(0, lastComma).replace(/,/g, "") + "." + raw.slice(lastComma + 1));
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  // Legacy "3.758,00 reais"
  m = text.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*reais/i);
  if (m) {
    const n = Number(m[1].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  return null;
}

function splitDescriptionBullets(blob) {
  if (!blob) return [];
  // Prefer semicolon / period splits when present
  if (/[;.]/.test(blob)) {
    return blob
      .split(/[;.]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
  }
  // CamelCase / lowercase→Upperword heuristic for glued Canva text
  const parts = blob
    .replace(/([a-záéíóúâêôãõç0-9%])([A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g, "$1|$2")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  return parts.length ? parts : [blob.trim()].filter(Boolean);
}

function isNoiseLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^contato:/i.test(t)) return true;
  if (/^garantia /i.test(t)) return true;
  if (/^valor:/i.test(t)) return true;
  if (/^r\$/i.test(t)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t)) return true;
  if (/^\d+(\.\d+)?(m|mm|cm|kg|kw|l|cv)?$/i.test(t)) return true;
  if (NOISE_LINES.has(t.toLowerCase())) return true;
  if (/thermal aquecimento/i.test(t)) return true;
  if (/empresa simples nacional/i.test(t)) return true;
  if (/lucas baggio/i.test(t)) return true;
  return false;
}

function looksLikeProductName(line) {
  const t = normalizeName(line);
  if (t.length < 3 || t.length > 120) return false;
  if (isNoiseLine(t)) return false;
  if (/^formas de pagamento/i.test(t)) return false;
  if (/pagamento|parcelado|parcelas|à vista|a vista/i.test(t) && t.length < 40) return false;
  if (PRODUCT_NAME_HINTS.test(t)) return true;
  // Title-ish: starts with capital, not a long glued sentence
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(t) && t.split(" ").length <= 12 && !/[;:]/.test(t)) {
    return true;
  }
  return false;
}

/**
 * Parse Grupos de produtos style: alternating description blobs and product names.
 * Pattern often: [desc lines] [Product Name] [qty digits]
 */
function parseGruposText(text, designId, designTitle, products) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let pendingDesc = [];

  for (const line of lines) {
    if (isNoiseLine(line)) {
      if (/^garantia |^valor |^formas |^r\$/i.test(line)) pendingDesc = [];
      continue;
    }
    if (/^\d+$/.test(line) || /^\d+[m]$/i.test(line)) {
      // quantity / page markers — flush pending if we just captured a name
      continue;
    }
    if (looksLikeProductName(line) && !/^[a-záéíóú]/.test(line)) {
      // Prefer lines that look like names over description continuation
      const name = normalizeName(line);
      // Skip if line looks more like description (long, many numbers)
      const isDescHeavy =
        line.length > 90 ||
        (line.match(/\d/g) || []).length > 8 ||
        /potência nominal|eficiência|dimensões|pressão máxima de funcionamento/i.test(line);

      if (!isDescHeavy && PRODUCT_NAME_HINTS.test(name)) {
        upsertProduct(products, name, splitDescriptionBullets(pendingDesc.join(" ")), designId, designTitle, null);
        pendingDesc = [];
        continue;
      }
    }
    // description fragment
    if (!isNoiseLine(line) && !/^r\$/i.test(line)) {
      pendingDesc.push(line);
    }
  }
}

/**
 * Parse modern quote (Daniel Viana style): Item name then qty, desc, Valor
 */
function parseQuoteText(text, designId, designTitle, products, clients) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Client from body
  let clientName = designTitle;
  let location = null;
  let document = null;

  for (let i = 0; i < lines.length; i++) {
    if (/^cliente$/i.test(lines[i]) && lines[i + 1] && !NOISE_LINES.has(lines[i + 1].toLowerCase())) {
      // Sometimes order is Cliente / Local labels then values later
    }
    if (/^daniel viana$|^abel$|^bianca$|^augusto$/i.test(lines[i])) {
      clientName = lines[i];
    }
  }

  // Prefer values after Cliente label when next non-label is a name
  const clienteIdx = lines.findIndex((l) => /^cliente$/i.test(l));
  if (clienteIdx >= 0) {
    for (let j = clienteIdx + 1; j < Math.min(clienteIdx + 8, lines.length); j++) {
      if (NOISE_LINES.has(lines[j].toLowerCase())) continue;
      if (/^(local|cidade|cpf|cnpj|data)$/i.test(lines[j])) continue;
      if (/^\d{1,2}\//.test(lines[j])) continue;
      if (looksLikeProductName(lines[j]) && PRODUCT_NAME_HINTS.test(lines[j])) break;
      if (lines[j].length >= 2 && lines[j].length < 80) {
        clientName = lines[j];
        break;
      }
    }
  }

  const localIdx = lines.findIndex((l) => /^(local|cidade)$/i.test(l));
  if (localIdx >= 0) {
    for (let j = localIdx + 1; j < Math.min(localIdx + 6, lines.length); j++) {
      if (NOISE_LINES.has(lines[j].toLowerCase())) continue;
      if (/^(cliente|cpf|cnpj|data|prazo)$/i.test(lines[j])) continue;
      if (/porto alegre|farroupilha|bento gonçalves|caxias|gramado|canela/i.test(lines[j]) ||
          (lines[j].length > 2 && lines[j].length < 40 && !PRODUCT_NAME_HINTS.test(lines[j]))) {
        location = lines[j].replace(/\s*A combinar.*/i, "").trim();
        break;
      }
    }
  }

  const cpfIdx = lines.findIndex((l) => /^cpf$/i.test(l));
  if (cpfIdx >= 0 && lines[cpfIdx + 1] && /[\dX]/.test(lines[cpfIdx + 1])) {
    document = lines[cpfIdx + 1];
  }

  // Line items with Valor: R$ or legacy "X.XXX,00 reais"
  for (let i = 0; i < lines.length; i++) {
    const isValorLine = /^valor:\s*r\$/i.test(lines[i]);
    const isReaisLine = /^\d{1,3}(?:\.\d{3})*,\d{2}\s*reais$/i.test(lines[i]);
    if (!isValorLine && !isReaisLine) continue;
    const price = parseBrlToCents(lines[i]);
    // Walk back for product name — prefer known product-name patterns over description lines
    let name = null;
    let descParts = [];
    let fallbackName = null;
    let fallbackDesc = [];
    for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
      if (/^\d+$/.test(lines[j])) continue;
      if (isNoiseLine(lines[j]) && !PRODUCT_NAME_HINTS.test(lines[j])) continue;
      if (PRODUCT_NAME_HINTS.test(lines[j]) && looksLikeProductName(lines[j])) {
        name = normalizeName(lines[j]);
        descParts = lines.slice(j + 1, i).filter((l) => !/^\d+$/.test(l) && !isNoiseLine(l) && !/reais$/i.test(l));
        break;
      }
      if (!fallbackName && looksLikeProductName(lines[j])) {
        fallbackName = normalizeName(lines[j]);
        fallbackDesc = lines.slice(j + 1, i).filter((l) => !/^\d+$/.test(l) && !isNoiseLine(l) && !/reais$/i.test(l));
      }
    }
    if (!name && fallbackName) {
      name = fallbackName;
      descParts = fallbackDesc;
    }
    if (name) {
      upsertProduct(products, name, splitDescriptionBullets(descParts.join(" ")), designId, designTitle, price);
    }
  }

  // Also capture named products without prices (Abel style)
  for (const line of lines) {
    if (PRODUCT_NAME_HINTS.test(line) && looksLikeProductName(line) && line.length < 100) {
      const heavy =
        line.length > 90 ||
        /potência nominal|classificação energética|dimensões externas/i.test(line);
      if (!heavy) upsertProduct(products, normalizeName(line), [], designId, designTitle, null);
    }
  }

  upsertClient(clients, clientName, location, document, designId, designTitle);
}

function upsertProduct(map, name, descriptionLines, designId, designTitle, priceCents) {
  const key = casefoldKey(name);
  let entry = map.get(key);
  if (!entry) {
    entry = {
      id: slugify(name) || `product-${map.size + 1}`,
      name,
      aliases: [],
      descriptionLines: [],
      defaultUnitPriceCents: null,
      imagePath: null,
      sources: [],
    };
    map.set(key, entry);
  } else if (casefoldKey(entry.name) !== key && !entry.aliases.includes(name)) {
    // keep canonical; add alias if different spelling
  }
  if (normalizeName(name) !== entry.name && !entry.aliases.includes(name)) {
    entry.aliases.push(name);
  }
  if (descriptionLines?.length && entry.descriptionLines.length === 0) {
    entry.descriptionLines = descriptionLines;
  } else if (descriptionLines?.length && descriptionLines.join("").length > entry.descriptionLines.join("").length) {
    entry.descriptionLines = descriptionLines;
  }
  if (priceCents != null) {
    entry.defaultUnitPriceCents = priceCents; // latest wins
  }
  if (!entry.sources.some((s) => s.designId === designId)) {
    entry.sources.push({ designId, designTitle });
  }
}

function upsertClient(map, name, location, document, designId, designTitle) {
  const clean = normalizeName(name)
    .replace(/\.pdf$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || clean.length < 2) return;
  if (/^grupos de produtos$/i.test(clean)) return;
  if (/^contrato /i.test(clean)) return;
  if (/^copy of /i.test(clean)) return;

  const key = casefoldKey(clean.replace(/\s+\d+$/, "")); // "Ana Helena 2" → ana helena
  const baseName = clean.replace(/\s+\d+$/, "").replace(/\s+-\s+.+$/, "").trim();

  let entry = map.get(key);
  if (!entry) {
    // try shorter key
    const shortKey = casefoldKey(baseName);
    entry = map.get(shortKey);
    if (!entry) {
      entry = {
        id: slugify(baseName) || `client-${map.size + 1}`,
        name: baseName,
        locations: [],
        document: null,
        sources: [],
      };
      map.set(shortKey, entry);
    }
  }
  if (location && !entry.locations.includes(location)) {
    entry.locations.push(location);
  }
  if (document && !entry.document) {
    entry.document = document;
  }
  if (!entry.sources.some((s) => s.designId === designId)) {
    entry.sources.push({ designId, designTitle });
  }
}

function shouldSkipTitle(title) {
  const t = title.toLowerCase().trim();
  return SKIP_TITLE_PREFIXES.some((p) => t.startsWith(p) || t === p.trim());
}

function shouldSkipContent(text) {
  const head = text.slice(0, 200).toLowerCase();
  return head.includes("contrato de prestação") || head.includes("contrato de prestacao");
}

function main() {
  const designsPath = path.join(RAW, "designs.json");
  if (!fs.existsSync(designsPath)) {
    console.error("Missing designs.json — run inventory first");
    process.exit(1);
  }
  const designs = JSON.parse(fs.readFileSync(designsPath, "utf8"));

  const products = new Map();
  const clients = new Map();

  const GRUPOS_IDS = new Set(["DAFRU1zMtbU", "DAFObBBIZEc"]);

  // 1) Prefer Grupos de produtos
  for (const id of GRUPOS_IDS) {
    const file = path.join(CONTENTS, `${id}.txt`);
    if (!fs.existsSync(file)) continue;
    const design = designs.find((d) => d.id === id) || { id, title: "Grupos de produtos" };
    parseGruposText(fs.readFileSync(file, "utf8"), design.id, design.title, products);
  }

  // 2) All other content files
  for (const design of designs) {
    if (GRUPOS_IDS.has(design.id)) continue;
    if (shouldSkipTitle(design.title)) continue;
    const file = path.join(CONTENTS, `${design.id}.txt`);
    if (!fs.existsSync(file)) {
      // still register client from title
      upsertClient(clients, design.title, null, null, design.id, design.title);
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    if (shouldSkipContent(text)) {
      // Service contracts masquerading as quote titles — keep file, skip parse
      continue;
    }
    parseQuoteText(text, design.id, design.title, products, clients);
  }

  // Clients from inventory titles even without content
  for (const design of designs) {
    if (shouldSkipTitle(design.title)) continue;
    if (GRUPOS_IDS.has(design.id)) continue;
    upsertClient(clients, design.title, null, null, design.id, design.title);
  }

  // Post-review cleanup: drop garbage products
  const productList = [...products.values()]
    .filter((p) => {
      if (p.name.length < 3) return false;
      if (/^(thermal|aquecimento|contato)$/i.test(p.name)) return false;
      if (/garantia /i.test(p.name)) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  // Ensure unique ids
  const usedIds = new Set();
  for (const p of productList) {
    let id = p.id;
    let n = 2;
    while (usedIds.has(id)) {
      id = `${p.id}-${n++}`;
    }
    p.id = id;
    usedIds.add(id);
  }

  const clientList = [...clients.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const usedClientIds = new Set();
  for (const c of clientList) {
    let id = c.id;
    let n = 2;
    while (usedClientIds.has(id)) {
      id = `${c.id}-${n++}`;
    }
    c.id = id;
    usedClientIds.add(id);
  }

  const meta = {
    sourceFolderId: "FAFOUXOmKmU",
    sourceFolderName: "budgets",
    extractedAt: new Date().toISOString(),
    designCount: designs.length,
    productCount: productList.length,
    clientCount: clientList.length,
    contentFilesParsed: fs.readdirSync(CONTENTS).filter((f) => f.endsWith(".txt")).length,
    notes: [
      "Products primarily from Grupos de produtos (DAFRU1zMtbU / DAFObBBIZEc).",
      "Clients from design titles + Cliente fields when present.",
      "Prices best-effort from Valor: R$ lines; null when unknown.",
      "imagePath always null — Canva content API has no images.",
      "Human review recommended for aliases and description glue.",
    ],
  };

  fs.writeFileSync(path.join(DATA, "catalog.products.json"), JSON.stringify(productList, null, 2) + "\n");
  fs.writeFileSync(path.join(DATA, "catalog.clients.json"), JSON.stringify(clientList, null, 2) + "\n");
  fs.writeFileSync(path.join(DATA, "catalog.meta.json"), JSON.stringify(meta, null, 2) + "\n");

  console.log(`Wrote ${productList.length} products, ${clientList.length} clients`);
}

main();
