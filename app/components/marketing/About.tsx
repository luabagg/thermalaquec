import { Calendar, ShieldCheck, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export const About = () => {
  return (
    <section id="about" className="py-12 md:py-24 bg-secondary">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <img
              src="/solar-farm.webp"
              alt="Instalação de painéis solares em telhado"
              className="rounded-lg shadow-lg w-full"
              width="550"
              height="367"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col gap-6">
            <h2 className="text-3xl font-bold tracking-tight">Sobre Nós</h2>
            <p className="text-lg text-muted-foreground">
              A Thermal surgiu com a necessidade de oferecer ainda mais qualidade e profissionalismo em sistemas de aquecimento e geradores de energia solar, atribuída à mudanças estruturais como a implementação de departamento de engenharia próprio e integração de setores.
            </p>
            <p className="text-lg text-muted-foreground">
              Nossa experiência vem de meados de 2010, atuando em outras empresas do ramo. Com o passar dos anos a necessidade de se dedicar 100% ao negocio aumentou, estudando e criando as melhores formas para otimizar o atendimento bem como as soluções de acordo com as exigências dos clientes.
            </p>
          </div>
        </div>

        <div className="mt-16 md:mt-24 text-center">
          <h3 className="text-3xl font-bold mb-2">Nossa Expertise em Destaque</h3>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
            Combinamos anos de experiência com uma equipe altamente qualificada e engenharia de ponta para entregar os melhores resultados.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
              <CardHeader className="flex flex-row items-center gap-4">
                <Calendar className="h-10 w-10 text-primary" />
                <CardTitle>+14 Anos de Experiência</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Atuamos no mercado desde 2010, acumulando profundo conhecimento e aprimorando constantemente nossas soluções em energias renováveis.
                </p>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
              <CardHeader className="flex flex-row items-center gap-4">
                <ShieldCheck className="h-10 w-10 text-primary" />
                <CardTitle>Equipe Certificada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Nossa equipe técnica é especializada e treinada nas normas NR 10, NR 18, NR 20 e NR 35, garantindo segurança e qualidade em cada projeto.
                </p>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
              <CardHeader className="flex flex-row items-center gap-4">
                <Wrench className="h-10 w-10 text-primary" />
                <CardTitle>Engenharia Própria</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Contamos com um departamento de engenharia interno, liderado por um profissional com mestrado em sustentabilidade e mais de 20 anos de experiência.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};