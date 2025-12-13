import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Produtos - Thermal Aquecimento" }];
};

export default function ProductPage() {
  return (
    <></>
  );
}