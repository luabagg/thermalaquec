/** The company block printed on every quotation. */
export const ISSUING_COMPANY = {
  legalName: "Thermal Aquecimento LTDA",
  taxRegime: "Empresa simples nacional",
  cnpj: "43.706.051/0001-46",
} as const;

/** The salesperson a quotation names under the logo and in its footer. */
export type SalesRep = {
  name: string;
  phone: string;
  city: string;
  email: string;
};

const LUCAS: SalesRep = {
  name: "Lucas Baggio",
  phone: "54 996161816",
  city: "Bento Gonçalves",
  email: "lucas@thermalaquec.com.br",
};

const JIOVANI: SalesRep = {
  name: "Jiovani Rafael",
  phone: "(54) 99155-3618",
  city: "Farroupilha/RS, 95173-148",
  email: "contato@thermalaquec.com.br",
};

/** Lucas signs his own quotations. Every other admin signs as Jiovani, the company contact. */
export function salesRepForAdmin(email: string | null | undefined): SalesRep {
  return email?.trim().toLowerCase() === LUCAS.email ? LUCAS : JIOVANI;
}
