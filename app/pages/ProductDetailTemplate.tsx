import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CustomBreadcrumb } from "~/components/marketing/CustomBreadcrumb";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { PageHero } from "~/components/marketing/PageHero";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { ProductData } from "~/data/products";
import { whatsappHref } from "~/lib/site";

interface ProductDetailTemplateProps {
  product: ProductData;
}

export const ProductDetailTemplate = ({ product }: ProductDetailTemplateProps) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentLightboxImage, setCurrentLightboxImage] = useState("");

  const whatsappLink = whatsappHref(
    `Olá! Tenho interesse no produto: ${product.name}. Poderia me dar mais informações?`,
  );

  const handleWhatsappClick = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "whatsapp_click",
        button_location: "product_detail_page",
        product_name: product.name,
      });
    }
  };

  const openLightbox = (imageSrc: string) => {
    setCurrentLightboxImage(imageSrc);
    setIsLightboxOpen(true);
  };

  const paragraphs = product.fullDescription.split("\n\n");
  const introParagraph = paragraphs[0];
  const highlightedTopics = paragraphs.slice(1).map((p) => {
    const [title, ...rest] = p.split(":");
    return {
      title: title.trim(),
      description: rest.join(":").trim(),
    };
  });

  const hasGalleryImages = product.galleryImages && product.galleryImages.length > 0;

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Produtos", href: "/produtos" },
    { label: product.name },
  ];

  return (
    <>
      <main className="flex-grow">
        <PageHero
          title={product.name}
          description={product.shortDescription}
          imageSrc={product.mainImage}
          imageAlt={product.name}
        />

        <div className="w-full border-b border-border bg-secondary py-4 md:py-5">
          <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
            <CustomBreadcrumb items={breadcrumbItems} />
          </div>
        </div>

        <section className="bg-secondary py-16 md:py-24">
          <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
            <FadeInOnScroll>
              <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-ink">
                Visão geral
              </h2>
              <div
                className={`grid items-start gap-12 ${
                  hasGalleryImages ? "md:grid-cols-2" : "md:grid-cols-1"
                }`}
              >
                <p className="max-w-[65ch] text-lg leading-relaxed text-muted-foreground">
                  {introParagraph}
                </p>
                {hasGalleryImages && (
                  <Carousel className="mx-auto w-full max-w-lg">
                    <CarouselContent>
                      {product.galleryImages?.map((imgSrc, index) => (
                        <CarouselItem key={imgSrc}>
                          <button
                            type="button"
                            className="w-full cursor-pointer overflow-hidden rounded-lg"
                            onClick={() => openLightbox(imgSrc)}
                            aria-label={`Ampliar imagem ${index + 1} de ${product.name}`}
                          >
                            <img
                              src={imgSrc}
                              alt={`${product.name} - imagem ${index + 1}`}
                              className="h-64 w-full object-cover transition-transform duration-300 ease-thermal hover:scale-[1.03]"
                            />
                          </button>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                )}
              </div>
            </FadeInOnScroll>
          </div>
        </section>

        {highlightedTopics.length > 0 && (
          <section className="bg-background py-16 md:py-24">
            <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
              <FadeInOnScroll>
                <h2 className="font-display mb-10 text-3xl font-bold tracking-tight text-ink">
                  Diferenciais
                </h2>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {highlightedTopics.map((topic) => (
                    <div
                      key={topic.title}
                      className="border-l-2 border-heat pl-5"
                    >
                      <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                        {topic.title}
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted-foreground">
                        {topic.description}
                      </p>
                    </div>
                  ))}
                </div>
              </FadeInOnScroll>
            </div>
          </section>
        )}

        <section className="bg-ink py-16 text-center md:py-20">
          <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
            <FadeInOnScroll>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white">
                Quer este sistema no seu projeto?
              </h2>
              <p className="mx-auto mt-4 mb-8 max-w-xl text-zinc-300 leading-relaxed">
                Fale conosco para dimensionamento e orçamento alinhados ao seu
                uso.
              </p>
              <Button asChild size="lg">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsappClick}
                >
                  Falar no WhatsApp
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
            </FadeInOnScroll>
          </div>
        </section>
      </main>

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <img
            src={currentLightboxImage}
            alt="Imagem ampliada do produto"
            className="h-auto max-h-[90vh] w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
