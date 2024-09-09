import React from "react";
import type { MetaFunction } from "@vercel/remix";
import { KeyboardArrowDown } from "@mui/icons-material";
import { Box } from "@mui/material";
import { Link } from "@remix-run/react";
import { animateScroll } from "react-scroll";
import Hero from "~/components/home/Hero";
import { LargeButton } from "~/components/utils/LargeButton";
import { Underline } from "~/components/utils/Underline";
import About from "~/components/pages/about";

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
  const baseContentRef = React.useRef<HTMLInputElement | null>(null);
  const [contentH, setContentH] = React.useState(0);

  React.useLayoutEffect(() => {
    if (baseContentRef.current === null) return;
    setContentH(baseContentRef.current.offsetTop - 100);
  }, []);

  return (
    <>
      <Hero steps={heroSteps} />
      <Box className="
        relative flex flex-col
        lg:ml-[25%] -mt-6
        items-center
      ">
        <LargeButton onclick={() => animateScroll.scrollTo(contentH)}>
          Saiba mais <KeyboardArrowDown />
        </LargeButton>
      </Box>
      <Box ref={baseContentRef} className="w-full h-full">
        <About />
        <About />
        <About />
        <About />
        <About />
        <About />
        <About />
      </Box>
    </>
  );
}
