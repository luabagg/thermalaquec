import { Link } from "@remix-run/react";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ProductData } from "~/data/products";
import { FadeInOnScroll } from "./FadeInOnScroll";

interface ProductCardProps {
  product: ProductData;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const productDetailPageLink = `/produtos/${product.slug}`;

  const handleProductCardClick = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "product_card_click",
        product_name: product.name,
        product_slug: product.slug,
      });
    }
  };

  return (
    <FadeInOnScroll className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-lg bg-card transition-transform duration-300 ease-thermal hover:-translate-y-1">
        <div
          className={`relative overflow-hidden ${
            product.imageFit === "contain" ? "bg-white" : ""
          }`}
        >
          <img
            src={product.mainImage}
            alt={product.name}
            className={`h-52 w-full transition-transform duration-500 ease-thermal group-hover:scale-[1.03] ${
              product.imageFit === "contain" ? "object-contain p-4" : "object-cover"
            }`}
            width="400"
            height="208"
            loading="lazy"
          />
        </div>
        <div className="flex flex-grow flex-col p-6">
          <h3 className="font-display mb-2 text-xl font-semibold tracking-tight text-ink">
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="mb-6 line-clamp-3 flex-grow text-sm leading-relaxed text-muted-foreground">
              {product.shortDescription}
            </p>
          )}
          <Button asChild variant="outline" className="mt-auto self-start">
            <Link to={productDetailPageLink} onClick={handleProductCardClick}>
              Ver produto
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </article>
    </FadeInOnScroll>
  );
};
