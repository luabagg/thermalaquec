import type { MetaFunction } from "@remix-run/react";
import Contact from "~/components/pages/contact";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Entre em Contato - Thermal Aquecimento" }];
};

export default function ContactPage() {
  return (
    <Contact />
  );
}