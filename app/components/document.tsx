import {
  Links,
  LiveReload,
  Meta,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import * as React from "react";
import RouteChangeAnnouncement from "~/components/utils/routeChangeAnnouncement"
import Footer from "./utils/footer";
import Navbar from "./utils/navbar";

const lang = "pt-br"

export default function Document({
  title,
  children
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <html lang={lang}>
      <head>
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
      </head>
      <body>
        <>
          <Navbar></Navbar>
          {children}
          <Footer></Footer>
        </>
        <RouteChangeAnnouncement />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
