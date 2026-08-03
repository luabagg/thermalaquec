import { Link } from "@remix-run/react";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { FadeInOnScroll } from "./FadeInOnScroll";

export const CalculatorCtaSection = () => {
  return (
    <FadeInOnScroll>
      <section className="bg-ink py-16 text-white md:py-20">
        <div className="container mx-auto grid max-w-screen-xl items-center gap-8 px-4 md:grid-cols-[1.4fr_auto] md:px-6">
          <div className="text-left">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Quanto você pode economizar com solar?
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">
              Informe o consumo da conta de luz e veja uma estimativa de
              investimento e retorno para o seu imóvel.
            </p>
          </div>
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link to="/calculadora-solar">
              Abrir simulador
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </FadeInOnScroll>
  );
};
