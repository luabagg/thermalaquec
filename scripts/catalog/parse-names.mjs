// Rule-based parser: one flat product name -> { brand, attributes, model, phrase }.
// `phrase` + `brand` identify the family. `attributes` and `model` become options.
import { BRANDS } from "./brands.mjs";

export const fold = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ATTRIBUTE_RULES = [
  // Material runs first: otherwise "inox 316L" is read as a 316 litre capacity.
  { option: "Material", pattern: /\binox\s*(304|316l|316|444)\b/gi, label: (m) => `Inox ${m[1].toUpperCase()}` },
  { option: "Material", pattern: /\ba[çc]o\s*(304|316l|316|444)\b/gi, label: (m) => `Aço ${m[1].toUpperCase()}` },
  { option: "Material", pattern: /\bppr\s?-?\s?3\b/gi, label: () => "PPR-3" },
  { option: "Material", pattern: /\binox\b/gi, label: () => "Inox" },
  { option: "Material", pattern: /\bpolipropileno\b/gi, label: () => "Polipropileno" },
  { option: "Material", pattern: /\bbronze\b/gi, label: () => "Bronze" },
  { option: "Material", pattern: /\bbimet[áa]lico\b/gi, label: () => "Bimetálico" },
  { option: "Capacidade", pattern: /(\d[\d.,]*)\s*(?:l\b|lts?\b|litros?\b)/gi, label: (m) => `${Number(m[1].replace(/\./g, "").replace(",", ".")).toLocaleString("pt-BR")}L` },
  { option: "Potência", pattern: /(\d+(?:[.,]\d+)?)\s*kw\b/gi, label: (m) => `${m[1].replace(".", ",")}kW` },
  { option: "Potência", pattern: /(\d+)\s*w\b(?!h)/gi, label: (m) => `${m[1]}W` },
  { option: "Potência", pattern: /(\d+(?:\/\d+)?)\s*cv\b/gi, label: (m) => `${m[1]} cv` },
  { option: "Potência", pattern: /(\d[\d.]*)\s*btus?\b/gi, label: (m) => `${m[1]} BTUs` },
  { option: "Tensão", pattern: /\b(110|127|220|380)\s*v\b/gi, label: (m) => `${m[1]}V` },
  { option: "Tensão", pattern: /\btrif[áa]sic[ao]\b/gi, label: () => "Trifásico" },
  { option: "Tensão", pattern: /\bmonof[áa]sic[ao]\b/gi, label: () => "Monofásico" },
  { option: "Tensão", pattern: /\bbif[áa]sic[ao]\b/gi, label: () => "Bifásico" },
  { option: "Temperatura", pattern: /(\d+)\s*graus\b/gi, label: (m) => `${m[1]} graus` },
  { option: "Pressão", pattern: /\balta\s*press[ãa]o\b|\baltapress[ãa]o\b/gi, label: () => "Alta pressão" },
  { option: "Pressão", pattern: /\bbaixa\s*press[ãa]o\b/gi, label: () => "Baixa pressão" },
  { option: "Pressão", pattern: /(\d+[.,]?\d*)\s*kgf\b/gi, label: (m) => `${m[1].replace(".", ",")} kgf` },
  { option: "Área", pattern: /(\d[\d.,]*)\s*m[²2]\b/gi, label: (m) => `${m[1]} m²` },
  { option: "Tubos", pattern: /(\d+)\s*tubos?\b/gi, label: (m) => `${m[1]} tubos` },
  { option: "Elementos", pattern: /(\d+)\s*elementos?\b/gi, label: (m) => `${m[1]} elementos` },
  { option: "Vias", pattern: /(\d+)\s*vias?\b/gi, label: (m) => `${m[1]} vias` },
  { option: "Bitola", pattern: /(\d+)\s*mm\b/gi, label: (m) => `${m[1]}mm` },
  { option: "Dimensão", pattern: /\b(\d+(?:[.,]\d+)?)\s*[x×\/-]\s*(\d+(?:[.,]\d+)?)\b/gi, label: (m) => `${m[1].replace(".", ",")}x${m[2].replace(".", ",")}` },
  { option: "Nível", pattern: /\bde n[íi]vel\b/gi, label: () => "Com nível" },
  { option: "Medida", pattern: /\bsob\s*medida\b/gi, label: () => "Sob medida" },
];

const KEY_NOISE = new Set("a as ao aos o os de do da dos das e em no na nos nas com sem para por um uma cor".split(" "));

const isModelCode = (token) => {
  const clean = token.replace(/[().,;]/g, "");
  if (clean.length < 2) return false;
  // A brand strip can leave the tail of a hyphenated code behind, as in "KOBC-100".
  if (/^[-–—][A-Za-z0-9]/.test(clean)) return true;
  if (/^\d+$/.test(clean)) return true;
  if (/\d/.test(clean) && /[a-z]/i.test(clean.replace(/[-.\/]/g, ""))) return true;
  return clean.length <= 6 && /^[A-Z0-9.\-\/]+$/.test(clean) && /[A-Z]/.test(clean);
};

export function parseProductName(rawName) {
  let working = ` ${rawName} `;
  const attributes = [];

  for (const rule of ATTRIBUTE_RULES) {
    working = working.replace(rule.pattern, (...args) => {
      const value = rule.label(args.slice(0, -2));
      if (!attributes.some((entry) => entry.option === rule.option && entry.value === value)) {
        attributes.push({ option: rule.option, value });
      }
      return " ";
    });
  }

  let brand = null;
  for (const candidate of BRANDS) {
    for (const token of candidate.match) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(^|[\\s(])${escaped}(?=[\\s)\\-.,]|$)`, "i");
      const match = pattern.exec(fold(working));
      if (!match) continue;
      const start = match.index + match[1].length;
      working = `${working.slice(0, start)} ${working.slice(start + token.length)}`;
      brand = candidate.name;
      break;
    }
    if (brand) break;
  }

  const model = [];
  const phraseTokens = [];
  for (const token of working.split(/\s+/)) {
    const clean = token.replace(/^[(\[]+|[)\].,;]+$/g, "");
    if (!clean || clean === "-" || clean === "–" || clean === "—") continue;
    if (isModelCode(clean)) model.push(clean);
    else phraseTokens.push(clean);
  }

  while (phraseTokens.length && KEY_NOISE.has(fold(phraseTokens[0]))) phraseTokens.shift();
  while (phraseTokens.length && KEY_NOISE.has(fold(phraseTokens[phraseTokens.length - 1]))) phraseTokens.pop();

  const phrase = phraseTokens.join(" ").replace(/\s+/g, " ").trim();
  const phraseKey = phraseTokens.map(fold).filter((token) => !KEY_NOISE.has(token)).join(" ");
  return { brand, attributes, model, phrase, phraseKey };
}
