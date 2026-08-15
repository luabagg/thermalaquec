import type { MetaFunction } from "@remix-run/node";

import { ProjectPillars } from "~/components/marketing/About";
import { CalculatorCtaSection } from "~/components/marketing/CalculatorCtaSection";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { Features } from "~/components/marketing/Features";
import { Hero } from "~/components/marketing/Hero";
import { Products } from "~/components/marketing/Products";
import { StatsSection } from "~/components/marketing/StatsSection";
import { buildHomeJsonLd, buildSeoMeta } from "~/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME } from "~/lib/site";

export const meta: MetaFunction = () =>
  buildSeoMeta({
    title: `${SITE_NAME} | Energia Solar e Aquecimento Central`,
    description: SITE_DESCRIPTION,
    path: "/",
    jsonLd: buildHomeJsonLd(),
  });

export default function Index() {
  return (
    <main className="flex-grow">
      <Hero />
      <CalculatorCtaSection />
      <FadeInOnScroll>
        <Products />
      </FadeInOnScroll>
      <StatsSection />
      <FadeInOnScroll>
        <ProjectPillars />
      </FadeInOnScroll>
      <FadeInOnScroll>
        <Features />
      </FadeInOnScroll>
    </main>
  );
}
