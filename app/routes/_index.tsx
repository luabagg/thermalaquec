import { Link } from "@remix-run/react";
import type { MetaFunction } from "@vercel/remix";
import Hero from "~/components/home/Hero";
import { Underline } from "~/components/utils/Underline";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Thermal Aquecimento - Aquecimento de Casas e Piscinas" }];
};

const heroSteps: Array<{ title: React.ReactNode, text: string }> = [
  {
    title: <>Conheça a <Underline>Thermal</Underline>. 🔥 Aquecimento de qualidade para seu lar.</>,
    text: "Oferecemos as melhores soluções de aquecimento no mercado, atuando a mais de 5 anos em todo Rio Grande do Sul. Não espere mais para desfrutar do conforto que merece - entre em contato conosco hoje mesmo."
  },
  {
    title: <>Somos uma empresa dedicada em oferecer as melhores soluções de aquecimento disponíveis no mercado.</>,
    text: "Para nós, o cliente é prioridade. Conheça nossos projetos e solicite um orçamento personalizado."
  },
  {
    title: <>Veja mais sobre nossos <Link to="/services" title="services" ><Underline>serviços</Underline></Link > ou solicite um < Link to="/contact" title="contact us" > <Underline>orçamento</Underline></Link >.</>,
    text: "Explore as soluções de aquecimento que temos disponíveis para você. Estaremos prontos para ajudá-lo a encontrar a melhor solução para suas necessidades."
  }
]

export default function Index() {
  return (
    <>
      <Hero steps={heroSteps} />
    </>
  );
}
