import type { MetaFunction } from "@vercel/remix";
import Hero from "~/components/hero";

export const meta: MetaFunction = () => {
  return [{ title: "Thermal Aquecimento - Aquecimento de Casas e Piscinas" }];
};

export default function Index() {
  return (
    <>
      <Hero />
    </>
  );
}
