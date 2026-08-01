import { Award, Users, Cog } from "lucide-react";

const features = [
  {
    icon: <Award className="h-10 w-10 text-primary" />,
    title: "Qualidade Superior",
    description: "Produtos fabricados com matéria-prima de alta qualidade e tecnologia de ponta.",
  },
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "Atendimento Especializado",
    description: "Equipe técnica para oferecer a melhor solução sustentável para sua necessidade.",
  },
  {
    icon: <Cog className="h-10 w-10 text-primary" />,
    title: "Engenharia Própria",
    description: "Departamento de engenharia dedicado para desenvolver soluções inovadoras e eficientes.",
  },
];

export const Features = () => {
  return (
    <section className="py-12 md:py-24 bg-secondary">
      <div className="container mx-auto text-center max-w-screen-xl px-4 md:px-6">
        <h2 className="text-3xl font-bold mb-2">Por que escolher a Thermal?</h2>
        <p className="text-muted-foreground mb-12">
          Nossos diferenciais garantem a sua satisfação.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center gap-4 p-6">
              {feature.icon}
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};