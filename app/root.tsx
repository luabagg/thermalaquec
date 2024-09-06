import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import { Analytics } from "@vercel/analytics/react";

import globalStyles from "~/styles/global.css?url";
import tailwindStyles from "~/styles/tailwind.css?url";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import RouteChangeAnnouncement from "~/components/routeChangeAnnouncement";
import Navbar from "~/components/navbar";
// import Footer from "~/components/footer";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
  { rel: "stylesheet", href: tailwindStyles },
  {
    rel: "icon",
    href: "/favicon.ico",
    type: "image/x-icon",
  },
  {
    rel: "stylesheet",
    href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
  },
];

export const meta: MetaFunction = () => [
  {
    charSet: "utf-8"
  },
  {
    name: "viewport",
    content: "width=device-width,initial-scale=1"
  },
  {
    name: "author",
    content: "luabagg"
  },
  {
    name: "description",
    content: "Mantenha a sua casa e piscina aquecidas durante todo o ano com a Thermal Aquecimento. Oferecemos serviços profissionais de instalação e manutenção de sistemas de aquecimento residencial e para piscinas, para você conseguir desfrutar de conforto e lazer em todas as estações. Entre em contato conosco hoje mesmo e veja como podemos tornar sua casa e piscina mais acolhedoras e agradáveis."
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="
        bg-gray-dark-900
        text-white
        font-serif
      ">
        <Navbar />
        {children}
        {/* <Footer /> */}
        <RouteChangeAnnouncement />
        <ScrollRestoration />
        <Scripts />
        <Analytics />
        <LiveReload />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    switch (error.status) { }
  }

  return
}