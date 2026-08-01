import type { MetaFunction } from "@remix-run/node";

import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";

export const meta: MetaFunction = () => buildNoIndexMeta(`Página não encontrada | ${SITE_NAME}`, "A página solicitada não existe.");

export function loader() {
  return new Response(null, { status: 404 });
}

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
