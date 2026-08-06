const highlights = [
  {
    title: "+14 anos no mercado",
    description:
      "Atuação desde 2010 em energias renováveis e sistemas de aquecimento, com projetos residenciais e corporativos.",
  },
  {
    title: "Equipe certificada",
    description:
      "Técnicos treinados nas normas NR 10, NR 18, NR 20 e NR 35, com foco em segurança em campo.",
  },
  {
    title: "Engenharia própria",
    description:
      "Departamento interno liderado por engenheiro com mestrado em sustentabilidade e mais de 20 anos de experiência.",
  },
];

export const About = () => {
  return (
    <section id="about" className="bg-secondary py-16 md:py-24">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
          {/* Text first on mobile; image left on desktop */}
          <div className="order-1 flex flex-col gap-5 md:order-2">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Engenharia de aquecimento e solar, de Farroupilha para o RS
            </h2>
            <p className="max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
              A Thermal nasceu para elevar o padrão de qualidade em sistemas de
              aquecimento e geração solar. Estruturamos engenharia própria e
              integramos as áreas técnicas para entregar projetos completos, do
              dimensionamento à instalação.
            </p>
            <p className="max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
              Nossa experiência vem de meados de 2010, em outras empresas do
              ramo. Com o tempo, dedicamos o negócio 100% a otimizar atendimento
              e soluções conforme a exigência de cada cliente.
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

        <div className="mt-16 border-t border-border pt-12 md:mt-20 md:pt-16">
          <h3 className="font-display max-w-xl text-2xl font-bold tracking-tight md:text-3xl">
            O que sustenta cada projeto
          </h3>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {highlights.map((item) => (
              <div key={item.title} className="border-l-2 border-heat pl-5">
                <h4 className="font-display text-xl font-semibold tracking-tight">
                  {item.title}
                </h4>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
