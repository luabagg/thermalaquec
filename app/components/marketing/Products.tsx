import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { productsData } from "~/data/products";

const productsToShowOnHomepage = productsData.slice(0, 3);

export const Products = () => {
  return (
    <section className="py-12 md:py-24">
      <div className="container mx-auto text-center max-w-screen-xl px-4 md:px-6">
        <h2 className="text-3xl font-bold mb-2">Nossos Produtos em Destaque</h2>
        <p className="text-muted-foreground mb-8">
          Conheça algumas de nossas principais soluções.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {productsToShowOnHomepage.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
        <div className="mt-12">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white">
            <Link to="/produtos">
              Ver Todos os Produtos
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
