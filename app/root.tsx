import React from "react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/remix"

// Layout
import { MuiDocument } from "./libs/mui/MuiDocument";
import { Layout as Wrapper } from "./components/layout/Layout";
import { ErrorPage } from "./components/layout/ErrorPage";

// Styles
import globalStyles from "~/styles/global.css?url";
import tailwindStyles from "~/styles/tailwind.css?url";
import { Email, Facebook, Instagram, LinkedIn, WhatsApp } from "@mui/icons-material";
import config from "./libs/tailwind/config";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
  { rel: "stylesheet", href: tailwindStyles },
  {
    rel: "icon",
    href: "/favicon.ico",
    type: "image/x-icon",
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
  {
    name: "theme-color",
    content: config.theme.colors['slate-dark'][500]
  }
];

const navigationMap = [
  { name: "Home", href: "/" },
  // { name: "Produtos", href: "/products" },
  { name: "Nosso trabalho", href: "/about" },
  { name: "Contato", href: "/contact" },
]

const socialMapNavbar = [
  { icon: Instagram, href: "https://www.instagram.com/thermalaquec" },
  { icon: Email, href: "mailto:comercial@thermalaquecimento.com.br?subject=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento" },
  { icon: Facebook, href: "https://www.facebook.com/thermalaquec" },
]

const socialMapFooter = [
  { icon: WhatsApp, href: "https://wa.me/5554999161816/?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento" },
  ...socialMapNavbar,
  { icon: LinkedIn, href: "https://www.linkedin.com/company/thermalaquec" },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="
        bg-slate-dark-500
        text-white
        font-serif leading-3
      ">
        <p className="text-center p-96">Hello World</p>
        {/* <Wrapper props={{
          navigationMap: navigationMap,
          socialMapNavbar: socialMapNavbar,
          socialMapFooter: socialMapFooter
        }}>
          {children}
        </Wrapper>
        <ScrollRestoration />
        <Scripts />
        <Analytics />
        <SpeedInsights /> */}
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
    return ErrorPage(error.status)
  }

  return
}
