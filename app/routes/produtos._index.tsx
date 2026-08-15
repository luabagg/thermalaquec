import type { MetaFunction } from "@remix-run/node";

import { CustomBreadcrumb } from "~/components/marketing/CustomBreadcrumb";
import { PageHero } from "~/components/marketing/PageHero";
import { ProductListingItem } from "~/components/marketing/ProductListingItem";
import { ProductNavigation } from "~/components/marketing/ProductNavigation";
import { productsData } from "~/data/products";
import { buildProductsJsonLd, buildSeoMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";

export const meta: MetaFunction = () =>
  buildSeoMeta({
    title: `Produtos e Serviços | ${SITE_NAME}`,
    description: "Soluções Thermal em aquecimento central, aquecimento solar, energia fotovoltaica e controle de umidade.",
    path: "/produtos",
    jsonLd: buildProductsJsonLd(productsData),
  });

export default function ProdutosPage() {
  const breadcrumbItems = [{ label: "Home", href: "/" }, { label: "Produtos" }];

  return (
    <main className="flex-grow">
      <PageHero
        title="Produtos e serviços"
        description="Aquecimento e energia solar dimensionados para residências, comércios e indústrias."
      />

      <div className="w-full border-b border-border bg-secondary py-4 md:py-5">
        <div className="container mx-auto max-w-[1400px] px-4 md:px-6">
          <CustomBreadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <section className="bg-background py-12 md:py-20">
        <div className="container mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-12">
            <ProductNavigation />
            <div className="min-w-0">
              {productsData.map((product, index) => (
                <ProductListingItem key={product.slug} product={product} reverse={index % 2 !== 0} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
