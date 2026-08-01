import { Link } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";
import { FadeInOnScroll } from "./FadeInOnScroll";
import { ProductData } from "~/data/products";

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
      <Card className="overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-2 flex flex-col h-full">
        <CardHeader className="p-0 relative">
          <img
            src={product.mainImage}
            alt={product.name}
            className="w-full h-56 object-cover"
            width="400"
            height="224"
            loading="lazy"
          />
        </CardHeader>
        <CardContent className="p-6 flex flex-col flex-grow">
          <CardTitle className="mb-2 text-xl font-semibold text-gray-800">
            {product.name}
          </CardTitle>
          {product.shortDescription && (
            <p className="text-muted-foreground text-sm mb-4 flex-grow line-clamp-4">
              {product.shortDescription}
            </p>
          )}
          <Button asChild className="mt-auto bg-primary hover:bg-primary/90 text-white">
            <Link to={productDetailPageLink} onClick={handleProductCardClick}>
              Saiba Mais
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </FadeInOnScroll>
  );
};
