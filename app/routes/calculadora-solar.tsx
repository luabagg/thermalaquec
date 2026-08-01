import type { MetaFunction } from "@remix-run/node";
import { SolarCalculator } from "~/components/marketing/SolarCalculator";

export const meta: MetaFunction = () => [
  { title: "Calculadora Solar | Thermal" },
  {
    name: "description",
    content:
      "Descubra o potencial de economia e o investimento necessário para ter energia solar.",
  },
];

export default function CalculadoraSolarPage() {
  return (
    <main className="relative flex w-full flex-grow items-center justify-center overflow-hidden bg-gray-800">
      <img
        src="/energia-solar.webp"
        alt="Painéis solares"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black opacity-80" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center md:flex-row">
        <div className="flex h-full w-full flex-col items-start justify-center p-8 text-center text-white md:w-1/2 md:p-12 md:text-left">
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
            Economize na <span className="text-primary">conta de luz</span>
            <br />
            com a marca líder do mercado
          </h1>
          <p className="mt-4 max-w-xl text-lg text-gray-200 md:text-xl">
            Descubra o potencial de economia e o investimento necessário para ter energia solar em
            sua casa ou empresa.
          </p>
        </div>

        <div className="flex h-full w-full items-center justify-center p-4 md:w-1/2 md:p-8">
          <SolarCalculator />
        </div>
      </div>
    </main>
  );
}
