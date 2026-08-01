import type { MetaFunction } from "@remix-run/node";
import { CustomBreadcrumb } from "~/components/marketing/CustomBreadcrumb";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { ProductListingItem } from "~/components/marketing/ProductListingItem";
import { productsData } from "~/data/products";

export const meta: MetaFunction = () => [
  { title: "Produtos | Thermal" },
  {
    name: "description",
    content:
      "Explore nossa gama completa de soluções em aquecimento e energia solar.",
  },
];

export default function ProdutosPage() {
  const breadcrumbItems = [{ label: "Home", href: "/" }, { label: "Produtos" }];

  return (
    <main className="flex-grow">
      <section className="relative flex w-full items-center justify-center bg-gray-800 py-24 text-white md:py-32">
        <img
          src="/energia-solar.webp"
          alt="Painéis solares"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-70" />
        <div className="relative z-10 container mx-auto px-4 text-center md:px-6">
          <FadeInOnScroll>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Nossos Produtos e Serviços
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-200 md:text-xl">
              Explore nossa gama completa de soluções em aquecimento e energia solar, projetadas
              para oferecer eficiência, conforto e sustentabilidade.
            </p>
          </FadeInOnScroll>
        </div>
      </section>

      <div className="w-full bg-secondary py-4 md:py-6">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          <CustomBreadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <section className="bg-secondary py-12 md:py-24">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          {productsData.map((product, index) => (
            <ProductListingItem
              key={product.slug}
              product={product}
              reverse={index % 2 !== 0}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
