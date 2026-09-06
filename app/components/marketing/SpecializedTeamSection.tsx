import { FadeInOnScroll } from "./FadeInOnScroll";

export const SpecializedTeamSection = () => {
  return (
    <section className="relative w-full overflow-hidden bg-ink py-16 text-white md:py-24">
      <img
        src="/energia-solar.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-25"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-ink/75" />
      <div className="relative z-10 container mx-auto max-w-screen-xl px-4 md:px-6">
        <FadeInOnScroll>
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:gap-16">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Equipe técnica em campo e no projeto
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-200">
                Foco em sustentabilidade com experiência comprovada. Nossa
                equipe é treinada nas normas NR 10, NR 18, NR 20 e NR 35.
              </p>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-200">
                Desde março de 2020 mantemos departamento de engenharia próprio,
                com engenheiro mestre em sustentabilidade e mais de 20 anos de
                atuação.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-3 self-start font-mono text-sm md:text-base">
              {["NR 10", "NR 18", "NR 20", "NR 35"].map((nr) => (
                <li
                  key={nr}
                  className="border border-white/15 bg-white/5 px-4 py-3 text-center font-medium tracking-wide"
                >
                  {nr}
                </li>
              ))}
            </ul>
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  );
};
