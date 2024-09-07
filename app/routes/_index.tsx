import type { MetaFunction } from "@vercel/remix";
import Hero from "~/components/home/Hero";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Thermal Aquecimento - Aquecimento de Casas e Piscinas" }];
};

export default function Index() {
  return (
    <>
      <Hero />
      </>
  );
}
