import type { MetaFunction } from "@remix-run/react";
import About from "~/components/pages/about";
import Services from "~/components/pages/services";
import { Section, SectionTitle } from "~/components/utils/Section";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Sobre a Empresa - Thermal Aquecimento" }];
};

export default function AboutPage() {
  return (
    <Section>
      <SectionTitle title="Nossos serviços" />
      <Services />
      <Services />
      <Services />
      <Services />
      <SectionTitle title="Quem somos" />
      <About />
    </Section>
  );
}