// import type { Product } from "@prisma/client";
// import type { LoaderFunction, MetaFunction } from "@vercel/remix";

// import React from "react";
// import { Link } from "@remix-run/react";
// import { Swiper } from "~/components/MobileStepper/Swiper";
// import { ContentGrid } from "~/components/ui/ContentGrid";
// import { LargeButton } from "~/components/ui/LargeButton";
// import { Section } from "~/components/ui/Section";
// import { Underline } from "~/components/ui/Underline";
// import { useViewport } from "~/hooks/viewport";
// import { getProducts } from "~/models/product.server";
// import { animateScroll } from "react-scroll";
// import heroBgMobile from "/images/hero-background-mobile.png";
// import heroBgDesktop from "/images/hero-background.png";
// import { MdKeyboardArrowDown } from "react-icons/md";

export default function Index() {
}

// export const meta: MetaFunction = ({ matches }) => {
//   const parentMeta = matches.flatMap((match) => match.meta ?? []);
//   return [...parentMeta, { title: "Thermal Aquecimento - Aquecimento de Casas e Piscinas" }];
// };

// const heroSteps: Array<{ title: React.ReactNode; text: string }> = [
//   {
//     title: (
//       <>
//         Conheça a <Underline>Thermal</Underline>. 🔥 Aquecimento de qualidade para seu lar.
//       </>
//     ),
//     text: "Oferecemos as melhores soluções de aquecimento no mercado, atuando a mais de 5 anos em todo Rio Grande do Sul. Não espere mais para desfrutar do conforto que merece - entre em contato conosco hoje mesmo.",
//   },
//   {
//     title: <>Somos uma empresa dedicada em oferecer as melhores soluções de aquecimento disponíveis no mercado.</>,
//     text: "Para nós, o cliente é prioridade. Conheça nossos projetos e solicite um orçamento personalizado.",
//   },
//   {
//     title: (
//       <>
//         Veja mais sobre nossos{" "}
//         <Link to="/about" aria-label="About page">
//           <Underline>serviços</Underline>
//         </Link>{" "}
//         ou solicite um{" "}
//         <Link to="/contact" aria-label="Contact page">
//           {" "}
//           <Underline>orçamento</Underline>
//         </Link>
//         .
//       </>
//     ),
//     text: "Explore as soluções de aquecimento que temos disponíveis para você. Estaremos prontos para ajudá-lo a encontrar a melhor solução para suas necessidades.",
//   },
// ];

// // export const loader: LoaderFunction = async () => {
// //   return await getProducts();
// // };

// export default function Index() {
//   const [contentH, setContentH] = React.useState(0);
//   const baseContentRef = React.useRef<HTMLInputElement | null>(null);
//   React.useLayoutEffect(() => {
//     if (baseContentRef.current === null) return;
//     setContentH(baseContentRef.current.offsetTop);
//   }, [baseContentRef, setContentH]);

//   // const products = useLoaderData<typeof loader>();
//   // const productsGrid = products.map((product: Product) => { return { title: product.name, text: product.shortDescription } });

//   return (
//     <>
//       <HeroSection buttonScrollTo={contentH} />

//       <div ref={baseContentRef} className="">
//         <Section>
//           <ContentGrid items={[]} />
//         </Section>
//       </div>
//     </>
//   );
// }

// const HeroSection = ({ buttonScrollTo }: { buttonScrollTo: number }) => {
//   const heroBackground = useViewport() < 768 ? heroBgMobile : heroBgDesktop;

//   return (
//     <div
//       id="hero"
//       style={{ backgroundImage: `url(${heroBackground})` }}
//       className="
//     w-full h-auto pt-40
//     bg-cover bg-center
//   "
//     >
//       <Swiper steps={heroSteps} />
//       <div
//         className="
//       flex flex-col items-center
//       pt-20 -mb-6
//       lg:ml-[25%]
//     "
//       >
//         <LargeButton onclick={() => animateScroll.scrollTo(buttonScrollTo)}>
//           Saiba mais <MdKeyboardArrowDown />
//         </LargeButton>
//       </div>
//     </div>
//   );
// };
