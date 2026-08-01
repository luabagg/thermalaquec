import type { LinksFunction, MetaFunction } from "@remix-run/node";

import React from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "@remix-run/react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/remix";
import { FloatingWhatsApp } from "~/components/marketing/FloatingWhatsApp";
import { Footer } from "~/components/marketing/Footer";
import { Header } from "~/components/marketing/Header";
import { Toaster as Sonner } from "~/components/ui/sonner";
import { Toaster } from "~/components/ui/toaster";
import { TooltipProvider } from "~/components/ui/tooltip";
import { buildHomeJsonLd, buildSeoMeta } from "~/lib/seo";
import { GTM_ID, SITE_DESCRIPTION, SITE_NAME } from "~/lib/site";
import floatingWhatsappStyles from "~/styles/floating-whatsapp.css?url";
import fontStyles from "~/styles/fonts.css?url";
import globalStyles from "~/styles/global.css?url";
import tailwindStyles from "~/styles/tailwind.css?url";
import { ErrorPage } from "./pages/ErrorPage/ErrorPage";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: fontStyles },
  { rel: "stylesheet", href: globalStyles },
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: floatingWhatsappStyles },
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  {
    rel: "icon",
    href: "/favicon-thermal.webp",
    type: "image/webp",
    sizes: "1024x1024",
  },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  {
    rel: "alternate",
    href: "/llms.txt",
    type: "text/plain",
    title: `Informações sobre ${SITE_NAME} para agentes de IA`,
  },
];

export const meta: MetaFunction = () =>
  buildSeoMeta({
    title: `${SITE_NAME} | Energia Solar e Aquecimento Central`,
    description: SITE_DESCRIPTION,
    path: "/",
    jsonLd: buildHomeJsonLd(),
  });

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <Outlet />
        <Footer />
        <FloatingWhatsApp />
        <Toaster />
        <Sonner />
      </div>
    </TooltipProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return ErrorPage(error.status);
  }

  return ErrorPage(500);
}
