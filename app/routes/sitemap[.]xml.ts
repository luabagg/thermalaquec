import { productsData } from "~/data/products";
import { absoluteUrl } from "~/lib/seo";

const publicPaths = ["/", "/sobre", "/produtos", "/calculadora-solar", "/panorama-energetico", "/contato"];

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function loader() {
  const paths = [...publicPaths, ...productsData.map((product) => `/produtos/${product.slug}`)];
  const urls = paths.map((path) => `  <url><loc>${escapeXml(absoluteUrl(path))}</loc></url>`).join("\n");
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
