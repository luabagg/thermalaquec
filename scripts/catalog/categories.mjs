// Catalog categories confirmed with the catalog owner on 2026-09-23.
// Each category lists the product lines (the `line` field of families.json) it holds.
// Order is display order in the quotation picker.
export const CATEGORIES = [
  {
    slug: "aquecimento",
    name: "Aquecimento",
    color: "#d55711",
    lines: [
      "Acumulador", "Aquecedor", "Aquecedor a gás", "Aquecedor elétrico", "Boiler",
      "Caldeira", "Caldeira a biomassa", "Caldeira a diesel", "Caldeira a gás", "Caldeira a lenha",
      "Design", "Geradora", "Geradora a lenha", "Geradora a pellets", "Geradora elétrico",
      "Lareira", "Reservatório", "Resistência elétrico", "Sistema de calor", "Trocador de calor",
    ],
  },
  { slug: "bombas-de-calor", name: "Bombas de calor", color: "#dc2626", lines: ["Bomba de calor", "Fancoil"] },
  {
    slug: "bombas",
    name: "Bombas",
    color: "#2563eb",
    lines: [
      "Bomba", "Bomba centrífuga", "Bomba de circulação", "Bomba periférica", "Bomba pressurizadora",
      "Pressurizador",
    ],
  },
  {
    slug: "hidraulica",
    name: "Hidráulica",
    color: "#0891b2",
    lines: [
      "Caixa de derivação", "Caixa de distribuição", "Cano", "Filtro", "Luva", "Mainfold", "Sistema",
      "Sistema de piscina", "Sistema de pressurização", "Tubo", "Vaso de expansão", "Válvula",
    ],
  },
  {
    slug: "eletrica-e-controle",
    name: "Elétrica e controle",
    color: "#7c3aed",
    lines: [
      "Caixa", "Caixa 4x4", "Controlador", "Controlador de temperatura", "Disjuntor", "Inversor",
      "Pressostato", "Quadro", "Quadro elétrico", "Sistema de temperatura", "Termostato", "Termostatos:",
    ],
  },
  {
    slug: "solar",
    name: "Solar",
    color: "#ca8a04",
    lines: ["Estrutura", "Inversor solar", "Módulo", "Módulo solar", "Otimizador solar", "Placa de piscina", "Placa solar"],
  },
  {
    slug: "piso-e-radiadores",
    name: "Piso e radiadores",
    color: "#db2777",
    lines: ["Cabo", "Difusor", "Duto", "Grade", "Grelha", "Malha", "Manta", "Piso", "Piso elétrico", "Placa", "Radiador", "Ventilador"],
  },
  {
    slug: "queimadores-e-combustivel",
    name: "Queimadores e combustível",
    color: "#57534e",
    lines: ["Queimador", "Queimador a diesel", "Tanque", "Tanque a diesel"],
  },
  { slug: "kits", name: "Kits", color: "#16a34a", lines: ["Kit", "Kit de calor"] },
  { slug: "servicos", name: "Serviços", color: "#64748b", lines: ["Interligação", "Interligação de pressurização", "Retirada"] },
];

const categoryByLine = new Map(CATEGORIES.flatMap((category) => category.lines.map((line) => [line, category.slug])));

/** The category slug of a product line, or undefined when no category lists it. */
export function categoryForLine(line) {
  return categoryByLine.get(line);
}
