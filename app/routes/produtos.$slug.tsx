import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { productsData } from "~/data/products";
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
    return [{ title: "Produto não encontrado | Thermal" }];
  }
  return [
    { title: `${data.product.name} | Thermal` },
    { name: "description", content: data.product.shortDescription },
  ];
};

export default function ProdutoDetailPage() {
  const { product } = useLoaderData<typeof loader>();
  return <ProductDetailTemplate product={product} />;
}
