import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { TaxIdInput } from "~/components/ui/tax-id-input";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { createQuoteClient, createQuotation, listQuoteClients } from "~/models/quotation.server";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Novo orçamento | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const clients = await listQuoteClients();
  return json({
    clients,
    preselectedClientId: clientId ? Number(clientId) : null,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const form = await request.formData();
  const mode = String(form.get("mode") || "existing");

  let clientId: number;
  if (mode === "new") {
    const name = String(form.get("name") || "").trim();
    if (!name) return json({ error: "Nome do cliente obrigatório" }, { status: 400 });
    const client = await createQuoteClient({
      name,
      location: String(form.get("location") || "") || null,
      document: String(form.get("document") || "") || null,
    });
    clientId = client.id;
  } else {
    clientId = Number(form.get("clientId"));
    if (!Number.isFinite(clientId)) {
      return json({ error: "Selecione um cliente" }, { status: 400 });
    }
  }

  const quotation = await createQuotation({ clientId, ownerUserId: user.id });
  return redirect(`/admin/quotations/${quotation.id}`);
};

export default function NewQuotation() {
  const { clients, preselectedClientId } = useLoaderData<typeof loader>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-grow flex-col gap-8 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/admin/quotations" className="underline-offset-2 hover:underline">
            Orçamentos
          </Link>{" "}
          / Novo
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Novo orçamento</h1>
        <p className="mt-2 text-muted-foreground">
          Título = nome do cliente. Data = hoje. CPF/CNPJ e local opcionais.
        </p>
      </div>

      <Form method="post" className="grid gap-4 border border-border p-4">
        <input type="hidden" name="mode" value="existing" />
        <div>
          <Label htmlFor="clientId">Cliente existente</Label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={preselectedClientId ?? ""}
            required={clients.length > 0}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Selecione…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={clients.length === 0}>
          Abrir builder
        </Button>
      </Form>

      <Form method="post" className="grid gap-3 border border-border p-4">
        <input type="hidden" name="mode" value="new" />
        <h2 className="font-display text-lg font-semibold">Ou criar cliente novo</h2>
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="location">Local (opcional)</Label>
            <Input id="location" name="location" />
          </div>
            <TaxIdInput id="document" name="document" />
        </div>
        <Button type="submit" variant="outline">
          Criar cliente e abrir builder
        </Button>
      </Form>
    </main>
  );
}
