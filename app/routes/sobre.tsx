import type { MetaFunction } from "@remix-run/node";
import { About } from "~/components/marketing/About";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { MissionVision } from "~/components/marketing/MissionVision";
import { SpecializedTeamSection } from "~/components/marketing/SpecializedTeamSection";

export const meta: MetaFunction = () => [
  { title: "A Empresa | Thermal" },
  {
    name: "description",
    content:
      "Conheça a história, os valores e a equipe por trás da Thermal, sua parceira em soluções sustentáveis.",
  },
];

export default function SobrePage() {
  return (
    <main className="flex-grow">
      <section className="relative flex w-full items-center justify-center bg-gray-800 py-24 text-white md:py-32">
        <img
          src="/energia-solar.webp"
          alt="Painéis solares"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-70" />
        <div className="relative z-10 container mx-auto px-4 text-center md:px-6">
          <FadeInOnScroll>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">A Empresa</h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-200 md:text-xl">
              Conheça a história, os valores e a equipe por trás da Thermal, sua parceira em
              soluções sustentáveis.
            </p>
          </FadeInOnScroll>
        </div>
      </section>
      <About />
      <SpecializedTeamSection />
      <MissionVision />
    </main>
  );
}
