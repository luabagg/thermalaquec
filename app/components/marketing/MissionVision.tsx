const items = [
  {
    title: "Missão",
    description: "Levar soluções em energias renováveis a todo o estado.",
  },
  {
    title: "Visão",
    description: "Ser referência no mercado nacional de aquecimento e solar.",
  },
  {
    title: "Valores",
    description: "Seriedade, dinamismo e liderança em cada entrega.",
  },
  {
    title: "Conduta",
    description:
      "Ética nas relações com clientes, colaboradores e fornecedores.",
  },
];

export const MissionVision = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="grid gap-0 border-y border-border md:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.title}
              className="border-b border-border px-0 py-8 last:border-b-0 md:border-b-0 md:border-r md:px-6 md:py-10 md:last:border-r-0"
            >
              <h3 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
                {item.title}
              </h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
