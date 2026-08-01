import { Link } from "@remix-run/react";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { productsData } from "~/data/products";
import { ProductCard } from "./ProductCard";

const productsToShowOnHomepage = productsData.slice(0, 3);

export const Products = () => {
  return (
    <section className="bg-secondary py-16 md:py-24">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl text-left">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Soluções em destaque
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Aquecimento e geração solar dimensionados para o uso real do seu
              imóvel.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start md:self-auto">
            <Link to="/produtos">
              Ver catálogo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {productsToShowOnHomepage.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
