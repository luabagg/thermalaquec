import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Form } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Administração | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  return null;
};

const LINKS = [
  { to: "/admin/quotations", label: "Orçamentos", desc: "Criar e editar orçamentos" },
  { to: "/admin/catalog", label: "Catálogo", desc: "Produtos para orçamento" },
  { to: "/admin/clients", label: "Clientes", desc: "Cadastro de clientes" },
] as const;

export default function AdminIndex() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-grow flex-col gap-8 px-4 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Painel admin</h1>
          <p className="mt-2 text-muted-foreground">Orçamentos, catálogo e clientes.</p>
        </div>
        <Form method="post" action="/admin/logout">
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </Form>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {LINKS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="block border border-border bg-card p-4 transition-colors hover:border-heat"
            >
              <span className="font-display text-lg font-semibold">{item.label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{item.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
