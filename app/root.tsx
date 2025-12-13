import type { LinksFunction, MetaFunction } from "@remix-run/node";

import React from "react";
import { HeroUIProvider } from "@heroui/react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "@remix-run/react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/remix";
import config from "~/libs/tailwind/config";
import globalStyles from "~/styles/global.css?url";
import tailwindStyles from "~/styles/tailwind.css?url";
import { Provider } from "jotai";
import { FaFacebook, FaInstagram, FaLinkedin, FaWhatsapp } from "react-icons/fa";
import { MdMail } from "react-icons/md";
import { FloatingWhatsApp } from "./components/FloatingWhatsapp/FloatingWhatsApp";
import Footer, { SocialMap as FooterSocialMap } from "./components/Footer/Footer";
import Navbar, { LinksMap, SocialMap as NavSocialMap } from "./components/Navbar/Navbar";
import RouteChangeAnnouncement from "./components/RouteChangeAnnouncement/RouteChangeAnnouncement";
import { ErrorPage } from "./pages/ErrorPage/ErrorPage";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
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
    name: "author",
    content: "luabagg",
  },
  {
    name: "description",
    content:
      "Mantenha a sua casa e piscina aquecidas durante todo o ano com a Thermal Aquecimento. Oferecemos serviços profissionais de instalação e manutenção de sistemas de aquecimento residencial e para piscinas, para você conseguir desfrutar de conforto e lazer em todas as estações. Entre em contato conosco hoje mesmo e veja como podemos tornar sua casa e piscina mais acolhedoras e agradáveis.",
  },
  {
    name: "theme-color",
    content: config.theme.colors["slate-dark"][500],
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
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

const inquiryMsg = encodeURIComponent("Olá, gostaria de solicitar um orçamento");

const navLinks: LinksMap = [
  { name: "Home", href: "/" },
  // { name: "Produtos", href: "/products" },
  { name: "Nosso trabalho", href: "/about" },
  { name: "Contato", href: "/contact" },
];

const navSocial: NavSocialMap = [
  { icon: FaInstagram, href: "https://www.instagram.com/thermalaquec" },
  {
    icon: MdMail,
    href: `mailto:comercial@thermalaquecimento.com.br?subject=${inquiryMsg}`,
  },
  { icon: FaFacebook, href: "https://www.facebook.com/thermalaquec" },
];

const footerSocial: FooterSocialMap = [
  {
    icon: FaWhatsapp,
    href: `https://wa.me/5554999161816/?text=${inquiryMsg}`,
  },
  ...navSocial,
  { icon: FaLinkedin, href: "https://www.linkedin.com/company/thermalaquec" },
];

export default function App() {
  return (
    <Provider>
      <HeroUIProvider>
        <Navbar linksMap={navLinks} socialMap={navSocial} />
        <Outlet />
        <Footer socialMap={footerSocial} />
        <RouteChangeAnnouncement />
        <FloatingWhatsApp />
      </HeroUIProvider>
    </Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return ErrorPage(error.status);
  }

  return;
}
