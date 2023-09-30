import { V2_MetaFunction } from "@remix-run/react";
import About from "~/components/pages/about";
import Contact from "~/components/pages/contact";
import Hero from "~/components/pages/hero";
import Services from "~/components/pages/services";

export const meta: V2_MetaFunction = () => {
  return [{ title: "Thermal Aquecimento - Aquecimento de Casas e Piscinas" }];
};

export default function Index() {
  return (
    <>
      <Hero></Hero>
      <Services></Services>
      <About></About>
      <Contact></Contact>
    </>
  );
}
