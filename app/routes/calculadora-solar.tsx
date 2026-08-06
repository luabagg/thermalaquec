import type { MetaFunction } from "@remix-run/node";

import { SolarCalculator } from "~/components/marketing/SolarCalculator";
import { buildSeoMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";

export const meta: MetaFunction = () =>
  buildSeoMeta({
    title: `Calculadora Solar | ${SITE_NAME}`,
    description: "Estime economia e investimento para um sistema de energia solar com base no consumo da sua conta de luz.",
    path: "/calculadora-solar",
    image: "/energia-solar.webp",
    imageAlt: "Painéis de energia solar instalados pela Thermal Aquecimento",
  });

export default function CalculadoraSolarPage() {
  return (
    <main className="relative flex min-h-[calc(100dvh-72px)] w-full flex-grow items-center justify-center overflow-hidden bg-ink">
      <img
        src="/energia-solar.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-ink/80" />

      <div className="relative z-10 flex w-full flex-col items-center md:min-h-[calc(100dvh-72px)] md:flex-row">
        <div className="flex w-full flex-col items-start justify-center px-4 py-8 text-left text-white sm:px-6 md:w-1/2 md:p-12 lg:p-16">
          <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl lg:text-5xl">
            Estime a economia na conta de luz
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-300 md:mt-5 md:text-xl">
            Informe o consumo e veja uma estimativa de investimento para solar
            na sua casa ou empresa.
          </p>
        </div>

        <div className="flex w-full items-center justify-center px-3 pb-10 sm:px-4 md:w-1/2 md:p-8 md:pb-8">
          <SolarCalculator />
        </div>
      </div>
    </main>
  );
}
