import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";

export function ErrorPage(status: number) {
  const message =
    status === 404
      ? "A página que você está procurando não foi encontrada."
      : "Não foi possível acessar a página.";

  return (
    <main className="flex flex-grow flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-mono text-sm font-medium text-muted-foreground">Erro {status}</p>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">Erro ao navegar</h1>
      <p className="mt-4 max-w-md text-muted-foreground">{message}</p>
      <Button asChild className="mt-8">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
