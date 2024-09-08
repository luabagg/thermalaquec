import type { MetaFunction } from "@remix-run/react";
import About from "~/components/pages/about";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Sobre a Empresa - Thermal Aquecimento" }];
};

export default function AboutPage() {
  return (
    <About />
  );
}