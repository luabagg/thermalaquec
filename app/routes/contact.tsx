import type { MetaFunction } from "@remix-run/react";
import Contact from "~/components/pages/contact";

export const meta: MetaFunction = () => {
  return [{ title: "Thermal Aquecimento - Entre em Contato" }];
};

export default function ContactPage() {
  return (
    <Contact />
  );
}