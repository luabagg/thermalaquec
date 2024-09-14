import React from "react";
import { Link, useLoaderData } from "@remix-run/react";
import { Box } from "@mui/material";
import { KeyboardArrowDown } from "@mui/icons-material";
import { animateScroll } from "react-scroll";
import { LargeButton } from "~/components/utils/LargeButton";
import { Underline } from "~/components/utils/Underline";
import { Swiper } from "~/components/home/Swiper";
import { getProducts } from "~/models/product.server";
import { ContentGrid } from "~/components/utils/ContentGrid";
import { Section } from "~/components/utils/Section";
import heroBgDesktop from "/images/hero-background.png";
import heroBgMobile from "/images/hero-background-mobile.png";

import type { LoaderFunction, MetaFunction } from "@vercel/remix";
import type { Product } from "@prisma/client";
import { useViewport } from "~/components/utils/hooks/viewport";

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
    title: <>Veja mais sobre nossos <Link to="/about" aria-label="About page"><Underline>serviços</Underline></Link> ou solicite um < Link to="/contact" aria-label="Contact page"> <Underline>orçamento</Underline></Link>.</>,
    text: "Explore as soluções de aquecimento que temos disponíveis para você. Estaremos prontos para ajudá-lo a encontrar a melhor solução para suas necessidades."
  }
]

export const loader: LoaderFunction = async () => {
  return getProducts();
};

export default function Index() {
  const [contentH, setContentH] = React.useState(0);
  const baseContentRef = React.useRef<HTMLInputElement | null>(null);
  React.useLayoutEffect(() => {
    if (baseContentRef.current === null) return;
    setContentH(baseContentRef.current.offsetTop);
  }, []);

  const products = useLoaderData<typeof loader>();
  const productsGrid = products.map((product: Product) => { return { title: product.name, text: product.shortDescription } });

  return (
    <>
      <HeroSection buttonScrollTo={contentH} />

      <Box ref={baseContentRef} className="">
        <Section>
          <ContentGrid items={productsGrid} />
        </Section >
      </Box >
    </>
  );
}

const HeroSection = ({ buttonScrollTo }: { buttonScrollTo: number }) => {
  const heroBackground = useViewport() < 768 ? heroBgMobile : heroBgDesktop;

  return (
    <Box id="hero" style={{ backgroundImage: `url(${heroBackground})` }} className="
    w-full h-auto pt-40
    bg-cover bg-center
  ">
      <Swiper steps={heroSteps} />
      <Box className="
      flex flex-col items-center
      pt-20 -mb-6
      lg:ml-[25%]
    ">
        <LargeButton onclick={() => animateScroll.scrollTo(buttonScrollTo)}>
          Saiba mais <KeyboardArrowDown />
        </LargeButton>
      </Box>
    </Box>
  )
}