import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { createQuoteClient, listQuoteClients } from "~/models/quotation.server";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Clientes | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const clients = await listQuoteClients();
  return json({ clients });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) return json({ error: "Nome obrigatório" }, { status: 400 });
  const client = await createQuoteClient({
    name,
    location: String(form.get("location") || "") || null,
    document: String(form.get("document") || "") || null,
  });
  return redirect(`/admin/clients?created=${client.id}`);
};

export default function AdminClients() {
  const { clients } = useLoaderData<typeof loader>();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-grow flex-col gap-8 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/admin" className="underline-offset-2 hover:underline">
              Admin
            </Link>{" "}
            / Clientes
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold">Clientes</h1>
        </div>
      </div>

      <Form method="post" className="grid gap-3 border border-border p-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="location">Local (opcional)</Label>
          <Input id="location" name="location" />
        </div>
        <div>
          <Label htmlFor="document">CPF/CNPJ (opcional)</Label>
          <Input id="document" name="document" />
        </div>
        <div className="sm:col-span-4">
          <Button type="submit">Adicionar cliente</Button>
        </div>
      </Form>

      <ul className="divide-y divide-border border border-border">
        {clients.map((c) => (
          <li key={c.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">
                {[c.location, c.document].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <Link
              to={`/admin/quotations/new?clientId=${c.id}`}
              className="text-sm text-heat underline-offset-2 hover:underline"
            >
              Novo orçamento
            </Link>
          </li>
        ))}
        {clients.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente ainda.</li>
        ) : null}
      </ul>
    </main>
  );
}
