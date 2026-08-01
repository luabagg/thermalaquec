import type { MetaFunction } from "@remix-run/node";
import { CustomBreadcrumb } from "~/components/marketing/CustomBreadcrumb";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";

export const meta: MetaFunction = () => [
  { title: "Panorama Energético | Thermal" },
  {
    name: "description",
    content:
      "Entenda a evolução do consumo de energia e a importância das fontes renováveis.",
  },
];

export default function PanoramaEnergeticoPage() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Panorama Energético" },
  ];

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
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Panorama Energético
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-200 md:text-xl">
              Entenda a evolução do consumo de energia e a importância das fontes renováveis.
            </p>
          </FadeInOnScroll>
        </div>
      </section>

      <div className="w-full bg-secondary py-4 md:py-6">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          <CustomBreadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <section className="bg-secondary py-12 md:py-24">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          <FadeInOnScroll>
            <h2 className="mb-8 text-center text-3xl font-bold text-gray-800">
              A Importância da Energia Renovável
            </h2>
            <div className="prose prose-lg mx-auto mb-12 max-w-3xl text-gray-800">
              <p className="mb-4">
                O Sol, nossa principal fonte de energia, atua como uma gigantesca fornalha —
                aproximadamente um milhão de vezes maior que a Terra — situada a 150 milhões de
                quilômetros de distância. A intensidade de sua radiação sempre desempenhou um papel
                fundamental no aquecimento do planeta. Foi essa energia que possibilitou a formação
                da atmosfera, o surgimento da vida e a geração das reservas de combustíveis
                fósseis, como gás natural, petróleo e carvão, amplamente utilizadas pela sociedade
                moderna.
              </p>
              <p className="mb-4">
                Os combustíveis fósseis são formados a partir da decomposição orgânica de
                organismos vivos ao longo de extensos períodos geológicos. Estima-se que a
                quantidade de combustível fóssil consumida atualmente em um único ano tenha levado
                cerca de um milhão de anos para se formar. O ritmo de consumo energético observado
                nas últimas décadas supera significativamente a capacidade natural de renovação dos
                recursos disponíveis no ecossistema terrestre, que envolve a interação entre a
                atmosfera e os recursos naturais. Nas próximas quatro a cinco décadas, projeta-se
                uma redução expressiva na disponibilidade desses recursos, enquanto a população
                global continuará em crescimento.
              </p>
              <p>
                Diversas projeções de longo prazo para o mercado energético convergem para um mesmo
                cenário: dentro de um horizonte de 15 a 25 anos, a demanda mundial deverá ultrapassar
                a capacidade de oferta. O consumo energético acompanha diretamente a tendência de
                crescimento populacional. Nos últimos 40 anos, esse crescimento tem registrado uma
                média anual de aproximadamente 80 milhões de habitantes.
              </p>
            </div>
          </FadeInOnScroll>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            <FadeInOnScroll>
              <img
                src="/panoramaa_06.webp"
                alt="Gráfico de Consumo de Combustíveis Fósseis e População"
                className="h-auto w-full rounded-lg object-cover shadow-lg"
                width={600}
                height={400}
                loading="lazy"
              />
            </FadeInOnScroll>
            <FadeInOnScroll>
              <img
                src="/panoramaa_03.webp"
                alt="Gráfico de Consumo de Combustíveis Fósseis"
                className="h-auto w-full rounded-lg object-cover shadow-lg"
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
