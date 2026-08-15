const highlights = [
  {
    title: "Projeto completo",
    description:
      "Do dimensionamento à instalação, as áreas técnicas trabalham integradas em cada entrega.",
  },
  {
    title: "Atendimento em RS e SC",
    description:
      "Presença em diversos pontos do Rio Grande do Sul e de Santa Catarina, com soluções para residências, comércios e indústrias.",
  },
  {
    title: "Engenharia própria",
    description:
      "Departamento interno liderado por engenheiro com mestrado em sustentabilidade e mais de 20 anos de experiência.",
  },
];

export const About = ({ title }: { title: string }) => {
  return (
    <section id="about" className="bg-secondary py-16 md:py-24">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
          {/* Text first on mobile; image left on desktop */}
          <div className="order-1 flex flex-col gap-5 md:order-2">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              {title}
            </h2>
            <p className="max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
              Na Thermal, cada projeto parte das características do imóvel, do
              perfil de consumo e da rotina de uso para definir sistemas de
              aquecimento e geração solar sob medida.
            </p>
          </div>

          <div className="relative order-2 md:order-1">
            <img
              src="/fachada-thermal.webp"
              alt="Fachada da Thermal em Farroupilha"
              className="mx-auto aspect-[4/3] max-h-56 w-full max-w-md rounded-lg object-cover object-[center_35%] shadow-[0_24px_60px_rgba(20,20,20,0.12)] sm:max-h-72 md:mx-0 md:aspect-[4/5] md:max-h-none md:max-w-none"
              width="1440"
              height="1920"
              loading="lazy"
            />
            <div className="absolute -bottom-4 left-4 hidden h-1 w-24 bg-heat md:block" />
          </div>
        </div>
      </div>
    </section>
  );
};

export const ProjectPillars = () => {
  return (
    <section className="bg-secondary pb-16 md:pb-24">
      <div className="container mx-auto max-w-screen-xl border-t border-border px-4 pt-12 md:px-6 md:pt-16">
        <h2 className="font-display max-w-xl text-2xl font-bold tracking-tight md:text-3xl">
          O que sustenta cada projeto
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="border-l-2 border-heat pl-5">
              <h3 className="font-display text-xl font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
