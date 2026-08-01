import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

import { useLoaderData } from "@remix-run/react";
import { productsData } from "~/data/products";
import { buildNoIndexMeta, buildProductJsonLd, buildSeoMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { ProductDetailTemplate } from "~/pages/ProductDetailTemplate";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const product = productsData.find((item) => item.slug === params.slug);
  if (!product) {
    throw new Response("Produto não encontrado", { status: 404 });
  }
  return { product };
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.product) {
    return buildNoIndexMeta(`Produto não encontrado | ${SITE_NAME}`);
  }

  return buildSeoMeta({
    title: `${data.product.name} | ${SITE_NAME}`,
    description: data.product.shortDescription,
    path: `/produtos/${data.product.slug}`,
    image: data.product.mainImage,
    imageAlt: `${data.product.name} — ${SITE_NAME}`,
    type: "product",
    jsonLd: buildProductJsonLd(data.product),
  });
};

export default function ProdutoDetailPage() {
  const { product } = useLoaderData<typeof loader>();
  return <ProductDetailTemplate product={product} />;
}
