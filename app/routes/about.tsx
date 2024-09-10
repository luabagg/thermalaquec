import type { MetaFunction } from "@remix-run/react";
import { ContentGrid } from "~/components/utils/ContentGrid";
import { Section, SectionContent, SectionTitle } from "~/components/utils/Section";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Sobre a Empresa - Thermal Aquecimento" }];
};

const services = [
  {
    title: "Aquecimento de Casas",
    text: "Trabalhamos com aquecimento de casas, disponibilizando a venda de instalações e lareiras de alta qualidade. Também trabalhamos com a rede de aquecimento de sua casa, seja com um boiler ou até mesmo com placas solares. Tudo é customizável, de acordo com suas necessidades."
  },
  {
    title: "Aquecimento de Piscinas",
    text: "Fazemos instalação de aquecimento para piscinas com placas de piscina ou boilers de aquecimento. Nossos produtos são de alta qualidade e alta duração, comprovados pelo mercado."
  },
  {
    title: "Piso Aquecido",
    text: "Para mais conforto nos dias frios, disponibilizamos piso aquecido para sua residência. Contate-nos para fazermos uma avaliação."
  },
  {
    title: "Vendas e Instalações",
    text: "Trabalhamos com a venda e instalação de equipamentos de aquecimento. Desde lareiras, reservatórios, até placas solares e de piscinas."
  },
  {
    title: "Energia Fotovoltaica",
    text: "Trabalhamos com energia fotovoltaica, com placas da melhor qualidade. Contate-nos para fazermos uma avaliação de suas necessidades."
  },
  {
    title: "Reparo e Manutenção",
    text: "Oferecemos serviços de reparo e manutenção. Mesmo para sistemas já instalados, analisamos seu problema e garantimos a melhor solução."
  },
]

const about = [
  {
    title: "Nosso Processo",
    text: "Iniciamos com uma avaliação das necessidades do cliente, então projetamos uma solução personalizada e utilizamos as melhores tecnologias para garantir eficiência e sustentabilidade. Realizamos a instalação do sistema com padrões de qualidade e segurança e oferecemos serviços de manutenção e reparação em caso de qualquer problema."
  },
  {
    title: "Nossa Missão",
    text: "Nossa missão é fornecer soluções que atendam às necessidades dos nossos clientes, promovendo a sustentabilidade ambiental através do uso de fontes de energia renováveis e eficiência energética."
  }
]

export default function AboutPage() {
  return (
    <Section>
      <SectionTitle title="Nossos serviços" />
      <SectionContent description={
        "Oferecemos serviços topo de linha para aquecimento de casas e de piscinas. De instalações de lareiras, até o sistema inteiro de aquecimento de sua moradia residencial ou comercial."
      }>
        <ContentGrid items={services} />
      </SectionContent>

      <SectionTitle title="Quem somos" />
      <SectionContent description={
        "Nós fornecemos soluções de aquecimento de alta qualidade e eficiência que estão entre as melhores do mercado. Com mais de 5 anos de experiência, nossa empresa tem orgulho de servir todo o Rio Grande do Sul com excelência e comprometimento. Confie em nós para manter você e sua casa aquecidos e confortáveis durante todo o ano."
      }>
        <ContentGrid items={about} maxCols={2} />
      </SectionContent>

    </Section >
  );
}