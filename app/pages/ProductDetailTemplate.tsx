import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CustomBreadcrumb } from "~/components/marketing/CustomBreadcrumb";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { Button } from "~/components/ui/button";
import { Card, CardTitle } from "~/components/ui/card";
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
  const [currentLightboxImage, setCurrentLightboxImage] = useState('');

  const whatsappLink = whatsappHref(
    `Olá! Tenho interesse no produto: ${product.name}. Poderia me dar mais informações?`,
  );

  const handleWhatsappClick = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'whatsapp_click',
        button_location: 'product_detail_page',
        product_name: product.name,
      });
    }
  };

  const openLightbox = (imageSrc: string) => {
    setCurrentLightboxImage(imageSrc);
    setIsLightboxOpen(true);
  };

  // Processar a descrição completa para separar a introdução dos tópicos destacados
  const paragraphs = product.fullDescription.split('\n\n');
  const introParagraph = paragraphs[0];
  const highlightedTopics = paragraphs.slice(1).map(p => {
    const [title, ...rest] = p.split(':');
    return {
      title: title.trim(),
      description: rest.join(':').trim()
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
        {/* Hero Section */}
        <section className="relative w-full py-24 md:py-32 bg-gray-800 text-white flex items-center justify-center">
          <img src={product.mainImage} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black opacity-70"></div>
          <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
            <FadeInOnScroll>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">{product.name}</h1>
              <p className="mt-4 text-lg md:text-xl text-gray-200 max-w-3xl mx-auto">
                {product.shortDescription}
              </p>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Breadcrumb */}
        <div className="w-full bg-secondary py-4 md:py-6"> {/* Adicionado w-full, bg-gray-100 e padding aqui */}
          <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
            <CustomBreadcrumb items={breadcrumbItems} />
          </div>
        </div>

        {/* Overview Section: Intro Text and Gallery Images (2 columns) */}
        <section className="py-12 md:py-24 bg-secondary">
          <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
            <FadeInOnScroll>
              <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Visão Geral</h2>
              <div className={`grid ${hasGalleryImages ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-12 items-start`}>
                {/* Left Column: Main Description */}
                <div className="prose prose-lg max-w-none text-muted-foreground">
                  <p>{introParagraph}</p>
                </div>
                {/* Right Column: Gallery Images (if available) */}
                {hasGalleryImages && (
                  <Carousel className="w-full max-w-lg mx-auto">
                    <CarouselContent>
                      {product.galleryImages?.map((imgSrc, index) => (
                        <CarouselItem key={index}>
                          <button
                            type="button"
                            className="w-full cursor-pointer overflow-hidden rounded-lg shadow-lg"
                            onClick={() => openLightbox(imgSrc)}
                            aria-label={`Ampliar imagem ${index + 1} de ${product.name}`}
                          >
                            <img
                              src={imgSrc}
                              alt={`${product.name} - Imagem ${index + 1}`}
                              className="h-64 w-full object-cover transition-transform duration-300 hover:scale-105"
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

        {/* Key Features Section: Highlighted Topics (Cards below 2 columns) */}
        {highlightedTopics.length > 0 && (
          <section className="py-12 md:py-24 bg-white">
            <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
              <FadeInOnScroll>
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Diferenciais e Benefícios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {highlightedTopics.map((topic, index) => (
                    <Card key={index} className="p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                      <CardTitle className="text-xl font-semibold mb-2 text-gray-800">{topic.title}</CardTitle>
                      <p className="text-muted-foreground">{topic.description}</p>
                    </Card>
                  ))}
                </div>
              </FadeInOnScroll>
            </div>
          </section>
        )}

        {/* Call to Action Section */}
        <section className="py-12 md:py-24 bg-primary text-center">
          <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
            <FadeInOnScroll>
              <h2 className="text-3xl font-bold mb-4 text-white">Interessado neste produto?</h2>
              <p className="text-gray-200 mb-8 max-w-2xl mx-auto">
                Fale conosco agora mesmo para obter mais informações e um orçamento personalizado.
              </p>
              <Button asChild size="lg" className="bg-black hover:bg-gray-800 text-white">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" onClick={handleWhatsappClick}>
                  Fale com um Especialista
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </FadeInOnScroll>
          </div>
        </section>
      </main>

      {/* Lightbox Dialog */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none">
          <img src={currentLightboxImage} alt="Imagem em destaque" className="w-full h-auto max-h-[90vh] object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
};