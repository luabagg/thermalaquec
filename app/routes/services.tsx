import type { MetaFunction } from "@remix-run/react";
import Services from "~/components/pages/services";

export const meta: MetaFunction = () => {
  return [{ title: "Thermal Aquecimento - Nossos Serviços" }];
};

export default function ServicesPage() {
  return (
    <Services></Services>
  );
}