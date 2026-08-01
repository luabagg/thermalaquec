import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";
import { FadeInOnScroll } from "./FadeInOnScroll";
import { ProductData } from "~/data/products";

interface ProductListingItemProps {
  product: ProductData;
  reverse?: boolean;
}

export const ProductListingItem = ({ product, reverse = false }: ProductListingItemProps) => {
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
      <div id={product.slug} className={`grid md:grid-cols-2 gap-12 items-center py-12 md:py-16 ${reverse ? "md:flex-row-reverse" : ""}`}>
        <div className={reverse ? "md:order-2" : "md:order-1"}>
          <img
            src={product.mainImage}
            alt={product.name}
            className="rounded-lg shadow-lg w-full object-cover h-64 md:h-96"
            width="550"
            height="384"
            loading="lazy"
          />
        </div>
        <div className={`flex flex-col gap-4 ${reverse ? "md:order-1" : "md:order-2"}`}>
          <h2 className="text-3xl font-bold tracking-tight text-gray-800">{product.name}</h2>
          <p className="text-lg text-muted-foreground">{product.shortDescription}</p>
          <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-white self-start">
            <Link to={productDetailPageLink} onClick={handleProductDetailClick}>
              Saiba Mais
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </FadeInOnScroll>
  );
};
