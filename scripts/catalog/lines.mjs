// Product lines. A line plus a brand identifies one family.
// Qualifiers that change what the product IS stay in the line; everything else becomes an option.
export const LINE_QUALIFIERS = [
  // head noun -> qualifier patterns, first match wins
  { match: /\bde\s+calor\b/i, label: "de calor" },
  { match: /\bde\s+circula[çc][ãa]o\b/i, label: "de circulação" },
  { match: /\bde\s+expans[ãa]o\b/i, label: "de expansão" },
  { match: /\bde\s+pressuriza[çc][ãa]o\b/i, label: "de pressurização" },
  { match: /\bde\s+deriva[çc][ãa]o\b/i, label: "de derivação" },
  { match: /\bde\s+distribui[çc][ãa]o\b/i, label: "de distribuição" },
  { match: /\bde\s+temperatura\b/i, label: "de temperatura" },
  { match: /\bde\s+piscina\b|\bp\/\s*piscina\b/i, label: "de piscina" },
  { match: /\ba\s+g[áa]s\b|\bde\s+[áa]gua\s+a\s+g[áa]s\b/i, label: "a gás" },
  { match: /\ba\s+lenha\b/i, label: "a lenha" },
  { match: /\ba\s+diesel\b|\bde\s+diesel\b|\bde\s+disel\b/i, label: "a diesel" },
  { match: /\ba\s+pellets?\b/i, label: "a pellets" },
  { match: /\bbiomassa\b/i, label: "a biomassa" },
  { match: /\bel[ée]tric[oa]\b/i, label: "elétrico" },
  { match: /\bsolar(es)?\b/i, label: "solar" },
  { match: /\bperif[ée]ric[oa]\b/i, label: "periférica" },
  { match: /\bpressurizador[oa]\b/i, label: "pressurizadora" },
  { match: /\bcentr[íi]fug[oa]\b/i, label: "centrífuga" },
  { match: /\bmural\b/i, label: "mural" },
];

// Head nouns normalized to a single singular form so plurals do not split a family.
export const HEAD_NOUNS = new Map(Object.entries({
  boiler: "Boiler", bomba: "Bomba", caldeira: "Caldeira", kit: "Kit", placa: "Placa",
  placas: "Placa", aquecedor: "Aquecedor", quadro: "Quadro", quadros: "Quadro",
  sistema: "Sistema", sistemas: "Sistema", trocador: "Trocador", geradora: "Geradora",
  lareira: "Lareira", controlador: "Controlador", controladores: "Controlador",
  estrutura: "Estrutura", estruturas: "Estrutura", valvula: "Válvula", valvulas: "Válvula",
  caixa: "Caixa", caixas: "Caixa", termostato: "Termostato", termostatos: "Termostato",
  cabo: "Cabo", cabos: "Cabo", piso: "Piso", radiador: "Radiador", radiadores: "Radiador",
  interligacao: "Interligação", mao: "Mão de obra", reservatorio: "Reservatório",
  tubo: "Tubo", tubos: "Tubo", inversor: "Inversor", inversores: "Inversor",
  manta: "Manta", mantas: "Manta", pressostato: "Pressostato", pressostatos: "Pressostato",
  queimador: "Queimador", tanque: "Tanque", tanques: "Tanque", vaso: "Vaso",
  acumulador: "Acumulador", cano: "Cano", canos: "Cano", mainfold: "Mainfold",
  malha: "Malha", malhas: "Malha", modulo: "Módulo", modulos: "Módulo",
  disjuntor: "Disjuntor", grade: "Grade", grades: "Grade", grelha: "Grelha",
  grelhas: "Grelha", pressurizador: "Pressurizador", pressurizadores: "Pressurizador",
  resistencia: "Resistência", retirada: "Retirada", design: "Design", difusor: "Difusor",
  duto: "Duto", dutos: "Duto", fan: "Fancoil", fancoil: "Fancoil", filtro: "Filtro",
  luva: "Luva", otimizador: "Otimizador", ventilador: "Ventilador",
}));
