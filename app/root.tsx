import React from "react";
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

// Layout
import { MuiDocument } from "./mui/MuiDocument";
import { MuiMeta } from "./mui/MuiMeta";
import { getMuiLinks } from "./mui/getMuiLinks";
import { Layout as Wrapper } from "./components/layout/Layout";

// Styles
import globalStyles from "~/styles/global.css?url";
import tailwindStyles from "~/styles/tailwind.css?url";

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
  ...getMuiLinks()
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
  }
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <Meta />
        <MuiMeta />
        <Links />
      </head>
      <body className="
        bg-slate-dark-500
        text-white
        font-serif leading-3
      ">
        <Wrapper>
          {children}
        </Wrapper>
        <ScrollRestoration />
        <Scripts />
        <Analytics />
        <LiveReload />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <MuiDocument>
      <Outlet />
    </MuiDocument>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    switch (error.status) { }
  }

  return
}
