import type { MetaFunction } from "@remix-run/node";
import { About } from "~/components/marketing/About";
import { CalculatorCtaSection } from "~/components/marketing/CalculatorCtaSection";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { Features } from "~/components/marketing/Features";
import { Hero } from "~/components/marketing/Hero";
import { MissionVision } from "~/components/marketing/MissionVision";
import { Products } from "~/components/marketing/Products";
import { StatsSection } from "~/components/marketing/StatsSection";

export const meta: MetaFunction = () => [
  { title: "Thermal | Energia Solar e Aquecimento Industrial" },
];

export default function Index() {
  return (
    <main className="flex-grow">
      <Hero />
      <CalculatorCtaSection />
      <FadeInOnScroll>
        <About />
      </FadeInOnScroll>
      <StatsSection />
      <FadeInOnScroll>
        <MissionVision />
      </FadeInOnScroll>
      <FadeInOnScroll>
        <Products />
      </FadeInOnScroll>
      <FadeInOnScroll>
        <Features />
      </FadeInOnScroll>
    </main>
  );
}
