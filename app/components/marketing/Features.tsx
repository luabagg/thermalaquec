const features = [
  {
    title: "Qualidade e confiabilidade",
    description:
      "Materiais selecionados e instalação criteriosa para operação estável ao longo dos anos.",
  },
  {
    title: "Eficiência e economia",
    description:
      "Projeto alinhado ao consumo real do imóvel, com foco em retorno sobre o investimento.",
  },
  {
    title: "Suporte técnico",
    description:
      "Acompanhamento direto da equipe Thermal do dimensionamento à pós-venda.",
  },
];

export const Features = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Por que escolher a Thermal
            </h2>
            <p className="mt-4 max-w-[40ch] text-lg text-muted-foreground leading-relaxed">
              Diferenciais que aparecem no desempenho e no suporte do projeto.
            </p>
          </div>
          <ul className="divide-y divide-border border-t border-border">
            {features.map((feature) => (
              <li key={feature.title} className="grid gap-2 py-6 md:grid-cols-[1fr_1.4fr] md:gap-8">
                <h3 className="font-display text-lg font-semibold tracking-tight md:text-xl">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
