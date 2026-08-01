import { Send, BarChart, Check, UserCheck } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { useIsMobile } from "~/hooks/use-mobile";

const items = [
  {
    icon: <Send className="h-10 w-10 text-primary" />,
    title: "Missão",
    description: "Fornecer soluções em energias renováveis para todo o estado.",
  },
  {
    icon: <BarChart className="h-10 w-10 text-primary" />,
    title: "Visão",
    description: "Ser referência no mercado nacional.",
  },
  {
    icon: <Check className="h-10 w-10 text-primary" />,
    title: "Valores",
    description: "Seriedade, dinamismo e liderança.",
  },
  {
    icon: <UserCheck className="h-10 w-10 text-primary" />,
    title: "Conduta",
    description: "Primar pela ética em nossas relações com clientes, colaboradores e fornecedores.",
  },
];

const MissionVisionItem = ({ item }: { item: typeof items[0] }) => (
  <div className="flex flex-col items-center text-center gap-4 p-6 h-full">
    {item.icon}
    <h3 className="text-2xl font-bold">{item.title}</h3>
    <p className="text-muted-foreground">{item.description}</p>
  </div>
);

export const MissionVision = () => {
  const isMobile = useIsMobile();

  return (
    <section className="py-12 md:py-24 bg-secondary">
      <div className="container mx-auto text-center max-w-screen-xl px-4 md:px-6">
        {isMobile ? (
          <Carousel className="w-full max-w-sm mx-auto">
            <CarouselContent>
              {items.map((item, index) => (
                <CarouselItem key={index}>
                  <MissionVisionItem item={item} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4" />
            <CarouselNext className="absolute right-4" />
          </Carousel>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {items.map((item) => (
              <MissionVisionItem key={item.title} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};