import React from "react";
import type { MetaFunction } from "@vercel/remix";
import { Link } from "@remix-run/react";
import { Box } from "@mui/material";
import { KeyboardArrowDown } from "@mui/icons-material";
import { animateScroll } from "react-scroll";
import { LargeButton } from "~/components/utils/LargeButton";
import { Underline } from "~/components/utils/Underline";
import { Swiper } from "~/components/home/Swiper";
import { Section } from "~/components/utils/Section";
import heroBg from "/images/hero-background.png";
import AboutPage from "./about";
import ContactPage from "./contact";

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
    setContentH(baseContentRef.current.offsetTop);
  }, []);

  return (
    <>
      <Box id="hero" style={{ backgroundImage: `url(${heroBg})` }} className="
        w-full h-auto pt-40
        bg-cover bg-center
      ">
        <Swiper steps={heroSteps} />
        <Box className="
          flex flex-col items-center
          pt-20 -mb-6
          lg:ml-[25%]
        ">
          <LargeButton onclick={() => animateScroll.scrollTo(contentH)}>
            Saiba mais <KeyboardArrowDown />
          </LargeButton>
        </Box>
      </Box>

      <Box ref={baseContentRef} className="">
        <Section>
          <AboutPage />
          <ContactPage />
        </Section>
      </Box>
    </>
  );
}
