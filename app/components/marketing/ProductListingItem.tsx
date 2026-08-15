import { Link } from "@remix-run/react";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ProductData } from "~/data/products";
import { FadeInOnScroll } from "./FadeInOnScroll";

interface ProductListingItemProps {
  product: ProductData;
  reverse?: boolean;
}

export const ProductListingItem = ({
  product,
  reverse = false,
}: ProductListingItemProps) => {
  const productDetailPageLink = `/produtos/${product.slug}`;

  const handleProductDetailClick = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "product_detail_view",
        product_name: product.name,
        product_slug: product.slug,
      });
    }
  };

  return (
    <FadeInOnScroll>
      <div
        id={product.slug}
        className="grid scroll-mt-24 items-center gap-10 border-b border-border py-12 last:border-b-0 md:grid-cols-2 md:gap-14 md:py-16"
      >
        <div className={reverse ? "md:order-2" : "md:order-1"}>
          <div
            className={`overflow-hidden rounded-lg ${
              product.imageFit === "contain" ? "bg-white" : ""
            }`}
          >
            <img
              src={product.mainImage}
              alt={product.name}
              className={`h-64 w-full md:h-96 ${
                product.imageFit === "contain"
                  ? "object-contain p-6"
                  : "object-cover"
              }`}
              width="550"
              height="384"
              loading="lazy"
            />
          </div>
        </div>
        <div
          className={`flex flex-col gap-4 ${reverse ? "md:order-1" : "md:order-2"}`}
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">
            {product.name}
          </h2>
          <p className="max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
            {product.shortDescription}
          </p>
          <Button asChild className="mt-2 self-start">
            <Link to={productDetailPageLink} onClick={handleProductDetailClick}>
              Ver detalhes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </FadeInOnScroll>
  );
};
