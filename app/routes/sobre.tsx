import type { MetaFunction } from "@remix-run/node";

import { About } from "~/components/marketing/About";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { MissionVision } from "~/components/marketing/MissionVision";
import { PageHero } from "~/components/marketing/PageHero";
import { SpecializedTeamSection } from "~/components/marketing/SpecializedTeamSection";
import { buildSeoMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";

export const meta: MetaFunction = () =>
  buildSeoMeta({
    title: `A Empresa | ${SITE_NAME}`,
    description: "Conheça a história, a engenharia e a equipe da Thermal Aquecimento em Farroupilha, Rio Grande do Sul.",
    path: "/sobre",
  });

export default function SobrePage() {
  return (
    <main className="flex-grow">
      <PageHero title="A empresa" description="História, engenharia própria e equipe técnica por trás dos projetos Thermal." />
      <FadeInOnScroll>
        <About title="Engenharia em soluções de aquecimento residencial e energia solar" />
      </FadeInOnScroll>
      <SpecializedTeamSection />
      <FadeInOnScroll>
        <MissionVision />
      </FadeInOnScroll>
    </main>
  );
}
