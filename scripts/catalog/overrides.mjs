// Hand-curated corrections, confirmed with the catalog owner.
// Everything here is an explicit decision, not a heuristic.

// Rows that are quotation line snippets, not products. Removed from the catalog.
export const DROP = [
  { match: /^m[ãa]o de obra/i, reason: "serviço lançado direto no orçamento" },
];

// Rows that only differ by a quantity. They collapse into one generic product.
export const GENERIC = [
  { match: /^cabos:\s*[\d.,]+\s*m[²2]$/i, name: "Cabo", reason: "metragem é quantidade do orçamento" },
  { match: /^caixas\s*4x4(\s*:\s*\d+)?$/i, name: "Caixa 4x4", reason: "quantidade é do orçamento" },
  { match: /^caixas$/i, name: "Caixa", reason: "produto genérico" },
];

// Typos in the source names. Left column is what the catalog holds today.
export const NAME_FIXES = [
  { from: "Boiler 600 baixa pressão PPR-3", to: "Boiler 600L baixa pressão PPR-3" },
  { from: "Boiler 1000L altapressão inox 304", to: "Boiler 1000L alta pressão inox 304" },
  { from: "Boiler baixa pressão PPR-3 - 400L", to: "Boiler 400L baixa pressão PPR-3" },
  { from: "Boiler baixa pressão PPR-3 - 500L", to: "Boiler 500L baixa pressão PPR-3" },
  { from: "Boiler baixa pressão PPR-3 - 600L", to: "Boiler 600L baixa pressão PPR-3" },
];
