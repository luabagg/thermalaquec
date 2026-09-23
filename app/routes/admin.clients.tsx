import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";

import { ClientFormFields } from "~/components/admin/ClientFormFields";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { createClient, listClients } from "~/models/client.server";
import { formatCityState, formatPhone, formatTaxId, parseClientForm } from "~/utils/client";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Clientes | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const search = new URL(request.url).searchParams.get("q") ?? "";
  return data({ clients: await listClients(search), search });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const parsed = parseClientForm(await request.formData());
  if (!parsed.ok) return data({ fieldErrors: parsed.fieldErrors }, { status: 400 });
  const result = await createClient(parsed.data);
  if (!result.ok) return data({ fieldErrors: result.fieldErrors }, { status: 400 });
  return redirect(`/admin/clients/${result.client.id}`);
};

export default function AdminClients() {
  const { clients, search } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const creating = navigation.state === "submitting" && navigation.formMethod === "POST";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-grow flex-col gap-6 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/admin" className="underline-offset-2 hover:underline">
            Admin
          </Link>{" "}
          / Clientes
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Clientes</h1>
      </div>

      <details open={clients.length === 0 || Boolean(actionData)} className="group border border-border">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          + Novo cliente
        </summary>
        <Form method="post" className="grid gap-4 border-t border-border p-4">
          <ClientFormFields fieldErrors={actionData?.fieldErrors} />
          <div>
            <Button type="submit" disabled={creating}>
              {creating ? "Salvando…" : "Adicionar cliente"}
            </Button>
          </div>
        </Form>
      </details>

      <Form method="get" role="search" className="flex gap-2">
        <Input name="q" defaultValue={search} placeholder="Buscar por nome, cidade ou CPF/CNPJ" aria-label="Buscar clientes" />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </Form>

      <ul className="divide-y divide-border border border-border">
        {clients.map((client) => (
          <li key={client.id}>
            <Link
              to={`/admin/clients/${client.id}`}
              className="flex flex-col gap-1 px-4 py-3 hover:bg-secondary/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[formatCityState(client), client.document ? formatTaxId(client.document) : null, client.phone ? formatPhone(client.phone) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {client._count.quotations === 1 ? "1 orçamento" : `${client._count.quotations} orçamentos`}
              </span>
            </Link>
          </li>
        ))}
        {clients.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted-foreground">
            {search ? "Nenhum cliente encontrado." : "Nenhum cliente ainda."}
          </li>
        ) : null}
      </ul>
    </main>
  );
}
