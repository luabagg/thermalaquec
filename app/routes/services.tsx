import type { MetaFunction } from "@remix-run/react";
import Services from "~/components/pages/services";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Nossos Serviços - Thermal Aquecimento" }];
};

export default function ServicesPage() {
  return (
    <Services />
  );
}