import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [{ title: "Página não encontrada | Thermal" }];

export default function NotFoundPage() {
  return (
    <main className="flex flex-grow flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="mt-4 text-muted-foreground">A página que você procura não existe.</p>
      <Button asChild className="mt-8">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
