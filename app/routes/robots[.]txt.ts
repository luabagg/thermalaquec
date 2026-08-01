import type { LoaderFunctionArgs } from "@remix-run/node";

import { SITE_URL } from "~/lib/site";

const canonicalHostname = new URL(SITE_URL).hostname;
const productionHostnames = new Set([canonicalHostname, `www.${canonicalHostname}`]);

export function loader({ request }: LoaderFunctionArgs) {
  const { hostname } = new URL(request.url);
  const isProduction = productionHostnames.has(hostname);
  const body = isProduction
    ? [
        "# Public content is available to search engines and AI agents.",
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "",
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        "",
      ].join("\n")
    : ["User-agent: *", "Disallow: /", ""].join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
      Vary: "Host",
    },
  });
}
