import { Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { CONTACT } from "~/lib/site";

export const Hero = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative flex min-h-[100dvh] w-full items-center justify-center bg-ink py-20 text-white md:justify-start md:py-0">
      <img
        src="/hero-background.webp"
        alt="Painéis solares com o sol ao fundo"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/65 to-ink/50 md:bg-gradient-to-r md:from-ink/90 md:via-ink/70 md:to-ink/35" />
      <div className="relative z-10 container mx-auto w-full max-w-screen-xl px-4 md:px-6">
        <div
          className={`mx-auto max-w-xl text-center transition-all duration-700 ease-thermal md:mx-0 md:text-left ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Aquecimento central e energia solar com engenharia própria
          </h1>
          <p className="mx-auto mt-5 max-w-[36ch] text-base leading-relaxed text-zinc-200 sm:text-lg md:mx-0 md:text-xl">
            Projetos sob medida para residências, comércios e indústrias no RS e
            em SC.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap md:justify-start">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/calculadora-solar">Simulador solar</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-white/40 bg-transparent text-white hover:border-white hover:bg-white hover:text-ink sm:w-auto"
            >
              <a
                href={CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
