import { productsData } from "~/data/products";
import { absoluteUrl } from "~/lib/seo";
import { CONTACT, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOCIAL } from "~/lib/site";

export function loader() {
  const products = productsData.map(
    (product) => `- [${product.name}](${absoluteUrl(`/produtos/${product.slug}`)}): ${product.shortDescription}`
  );
  const body = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Este arquivo resume as informações públicas oficiais da empresa para mecanismos de busca e agentes de IA. O conteúdo principal está em português do Brasil.",
    "",
    "## Empresa",
    "",
    `- Nome: ${SITE_NAME}`,
    `- Site oficial: ${SITE_URL}/`,
    `- Localização: ${CONTACT.addressLine}, ${CONTACT.cityLine}, Brasil`,
    "- Área principal de atendimento: Rio Grande do Sul, Brasil",
    "- Atuação: aquecimento central, aquecimento solar, energia fotovoltaica e controle de umidade",
    "",
    "## Páginas oficiais",
    "",
    `- [Página inicial](${absoluteUrl("/")})`,
    `- [Sobre a empresa](${absoluteUrl("/sobre")})`,
    `- [Produtos e serviços](${absoluteUrl("/produtos")})`,
    `- [Calculadora solar](${absoluteUrl("/calculadora-solar")})`,
    `- [Panorama energético](${absoluteUrl("/panorama-energetico")})`,
    `- [Contato](${absoluteUrl("/contato")})`,
    "",
    "## Produtos e serviços",
    "",
    ...products,
    "",
    "## Contato oficial",
    "",
    `- E-mail: ${CONTACT.email}`,
    `- Telefone e WhatsApp: +${CONTACT.phoneE164}`,
    `- Instagram: ${SOCIAL.instagram}`,
    "",
    "Para detalhes, use as páginas canônicas listadas acima como fonte primária.",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Language": "pt-BR",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
