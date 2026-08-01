import { Check } from "lucide-react";
import { FadeInOnScroll } from "./FadeInOnScroll";

export const SpecializedTeamSection = () => {
  return (
    <section className="relative w-full py-16 md:py-24 bg-gray-800 text-white overflow-hidden">
      <img
        src="/energia-solar.webp" // Usando a mesma imagem de fundo do Hero para consistência
        alt="Interior de escritório com vista para a natureza"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-screen-xl">
        <FadeInOnScroll>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Equipe Especializada</h2>
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-3xl">
            Nossa empresa tem foco principal na área de sustentabilidade e experiência
            comprovada, equipe técnica especializada e treinada dentro das normas:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-xs md:max-w-md">
            <div className="flex items-center gap-2 text-lg">
              <Check className="h-6 w-6 text-primary" /> NR 10
            </div>
            <div className="flex items-center gap-2 text-lg">
              <Check className="h-6 w-6 text-primary" /> NR 18
            </div>
            <div className="flex items-center gap-2 text-lg">
              <Check className="h-6 w-6 text-primary" /> NR 20
            </div>
            <div className="flex items-center gap-2 text-lg">
              <Check className="h-6 w-6 text-primary" /> NR 35
            </div>
          </div>
          <p className="text-lg md:text-xl text-gray-200 max-w-3xl">
            Em meados de Março de 2020 a Thermal criou departamento de engenharia
            próprio com a integração de Engenheiro, com Mestrado em Sustentabilidade e
            mais de 20 anos de experiência.
          </p>
        </FadeInOnScroll>
      </div>
    </section>
  );
};