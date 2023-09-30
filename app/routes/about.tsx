import type { MetaFunction } from "@remix-run/react";
import About from "~/components/pages/about";

export const meta: MetaFunction = () => {
  return [{ title: "Thermal Aquecimento - Sobre a Empresa" }];
};

export default function AboutPage() {
  return (
    <About />
  );
}