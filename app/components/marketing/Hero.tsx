import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { useEffect, useState } from "react";

export const Hero = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative w-full h-screen flex items-center bg-gray-800 text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60"></div>
      <img src="/hero-background.webp" alt="Painéis solares com o sol ao fundo" className="absolute inset-0 w-full h-full object-cover" />
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div
          className={`max-w-2xl text-left transition-all duration-1000 ease-out ${
            isLoaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
          }`}
        >
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            ESPECIALISTAS EM AQUECIMENTO CENTRAL E ENERGIA SOLAR
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-200">
            Soluções completas e de alta qualidade em energia solar e sistemas de aquecimento, com engenharia própria e equipe especializada.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white">
              <Link to="/sobre">Saiba Mais</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
