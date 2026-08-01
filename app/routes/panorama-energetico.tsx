import type { MetaFunction } from "@remix-run/node";

import { CustomBreadcrumb } from "~/components/marketing/CustomBreadcrumb";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { PageHero } from "~/components/marketing/PageHero";
import { buildSeoMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";

export const meta: MetaFunction = () =>
  buildSeoMeta({
    title: `Panorama Energético | ${SITE_NAME}`,
    description: "Entenda o consumo de energia, os limites dos combustíveis fósseis e o papel das fontes renováveis.",
    path: "/panorama-energetico",
    type: "article",
  });

export default function PanoramaEnergeticoPage() {
  const breadcrumbItems = [{ label: "Home", href: "/" }, { label: "Panorama Energético" }];

  return (
    <main className="flex-grow">
      <PageHero title="Panorama energético" description="Por que a transição para fontes renováveis deixou de ser opcional." />

      <div className="w-full border-b border-border bg-secondary py-4 md:py-5">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          <CustomBreadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <section className="bg-background py-16 md:py-24">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          <FadeInOnScroll>
            <h2 className="mb-8 max-w-2xl font-display text-3xl font-bold tracking-tight text-ink">A pressão sobre as fontes fósseis</h2>
            <div className="mx-auto mb-12 max-w-3xl space-y-5 text-lg leading-relaxed text-muted-foreground">
              <p>
                O Sol é a principal fonte de energia do planeta: uma fornalha cerca de um milhão de vezes maior que a Terra, a 150 milhões
                de quilômetros. Sua radiação aquece o planeta, formou a atmosfera, sustentou a vida e originou as reservas de combustíveis
                fósseis (gás natural, petróleo e carvão) que a sociedade moderna ainda consome em larga escala.
              </p>
              <p>
                Combustíveis fósseis nascem da decomposição orgânica ao longo de períodos geológicos. Estima-se que o volume queimado em um
                único ano hoje tenha levado cerca de um milhão de anos para se formar. O ritmo das últimas décadas ultrapassa a capacidade
                natural de renovação. Nas próximas quatro a cinco décadas, projeta-se queda forte na disponibilidade desses recursos,
                enquanto a população global segue crescendo.
              </p>
              <p>
                Projeções de longo prazo convergem: em 15 a 25 anos, a demanda mundial tende a superar a oferta. O consumo acompanha o
                crescimento populacional, com média anual próxima de 80 milhões de novos habitantes nas últimas quatro décadas.
              </p>
            </div>
          </FadeInOnScroll>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <FadeInOnScroll>
              <img
                src="/panoramaa_06.webp"
                alt="Gráfico de consumo de combustíveis fósseis e população"
                className="h-auto w-full rounded-lg border border-border object-cover"
                width={600}
                height={400}
                loading="lazy"
              />
            </FadeInOnScroll>
            <FadeInOnScroll>
              <img
                src="/panoramaa_03.webp"
                alt="Gráfico de consumo de combustíveis fósseis"
                className="h-auto w-full rounded-lg border border-border object-cover"
                width={600}
                height={400}
                loading="lazy"
              />
            </FadeInOnScroll>
          </div>
        </div>
      </section>
    </main>
  );
}
