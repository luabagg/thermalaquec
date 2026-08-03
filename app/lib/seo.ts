import type { MetaDescriptor } from "@remix-run/node";
import type { ProductData } from "~/data/products";

import { CONTACT, SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_URL, SOCIAL } from "~/lib/site";

type JsonLd = Record<string, unknown>;

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "product";
  jsonLd?: JsonLd;
};

const DEFAULT_IMAGE = "/fachada-thermal.webp";

export function absoluteUrl(path: string) {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function buildSeoMeta({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  imageAlt = `${SITE_NAME} em Farroupilha, Rio Grande do Sul`,
  type = "website",
  jsonLd,
}: SeoOptions): MetaDescriptor[] {
  const canonicalUrl = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  const descriptors: MetaDescriptor[] = [
    { title },
    { name: "description", content: description },
    { name: "theme-color", content: "#C2410C" },
    {
      name: "robots",
      content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
    {
      name: "googlebot",
      content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
    { tagName: "link", rel: "canonical", href: canonicalUrl },
    { property: "og:type", content: type },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: canonicalUrl },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: imageAlt },
  ];

  if (jsonLd) {
    descriptors.push({ "script:ld+json": jsonLd });
  }

  return descriptors;
}

export function buildNoIndexMeta(title: string, description = "Esta página não deve aparecer em resultados de busca."): MetaDescriptor[] {
  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "noindex, nofollow, noarchive" },
    { name: "googlebot", content: "noindex, nofollow, noarchive" },
  ];
}

const organizationNode: JsonLd = {
  "@type": ["Organization", "HVACBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: SITE_SHORT_NAME,
  url: `${SITE_URL}/`,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/logo.webp"),
  },
  image: absoluteUrl(DEFAULT_IMAGE),
  description: SITE_DESCRIPTION,
  email: CONTACT.email,
  telephone: `+${CONTACT.phoneE164}`,
  address: {
    "@type": "PostalAddress",
    ...CONTACT.address,
  },
  areaServed: [
    {
      "@type": "State",
      name: "Rio Grande do Sul",
    },
    {
      "@type": "State",
      name: "Santa Catarina",
    },
  ],

  sameAs: [SOCIAL.instagram],
};

const websiteNode: JsonLd = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  alternateName: SITE_SHORT_NAME,
  description: SITE_DESCRIPTION,
  inLanguage: "pt-BR",
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
};

export function buildHomeJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode, websiteNode],
  };
}

function breadcrumbNode(items: Array<{ name: string; path: string }>): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildProductsJsonLd(products: ProductData[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbNode([
        { name: "Início", path: "/" },
        { name: "Produtos e serviços", path: "/produtos" },
      ]),
      {
        "@type": "ItemList",
        name: `Produtos e serviços da ${SITE_NAME}`,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: absoluteUrl(`/produtos/${product.slug}`),
        })),
      },
    ],
  };
}

export function buildProductJsonLd(product: ProductData): JsonLd {
  const productUrl = absoluteUrl(`/produtos/${product.slug}`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbNode([
        { name: "Início", path: "/" },
        { name: "Produtos e serviços", path: "/produtos" },
        { name: product.name, path: `/produtos/${product.slug}` },
      ]),
      {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: product.name,
        description: product.shortDescription,
        image: [absoluteUrl(product.mainImage), ...(product.galleryImages ?? []).map(absoluteUrl)].filter(
          (image, index, images) => images.indexOf(image) === index
        ),
        url: productUrl,
        mainEntityOfPage: productUrl,
        brand: {
          "@type": "Brand",
          name: SITE_NAME,
        },
      },
    ],
  };
}
