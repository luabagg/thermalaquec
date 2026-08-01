import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";
import { FadeInOnScroll } from "./FadeInOnScroll";

export const CalculatorCtaSection = () => {
  return (
    <FadeInOnScroll>
      <section className="py-12 md:py-24 bg-gray-800 text-center text-white">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          <h2 className="text-3xl font-bold mb-4">Calcule sua Economia Solar!</h2>
          <p className="text-gray-200 mb-8 max-w-2xl mx-auto">
            Use nossa calculadora para estimar o potencial de economia e o investimento necessário para ter energia solar em sua propriedade.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white">
            <Link to="/calculadora-solar">
              Acessar Calculadora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </FadeInOnScroll>
  );
};
