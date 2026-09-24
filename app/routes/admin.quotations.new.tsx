import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";

import { ClientFormFields } from "~/admin/clients/ClientFormFields";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { createClient, listClientsForQuotation } from "~/admin/clients/client.server";
import { createQuotation } from "~/admin/quotations/quotation.server";
import { formatCityState } from "~/admin/clients/client-display";
import { parseClientForm } from "~/admin/clients/client-form";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Novo orçamento | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const preselected = Number(new URL(request.url).searchParams.get("clientId"));
  return { clients: await listClientsForQuotation(), preselectedClientId: Number.isInteger(preselected) ? preselected : null };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const form = await request.formData();

  let clientId: number;
  if (form.get("mode") === "new") {
    const parsed = parseClientForm(form);
    if (!parsed.ok) return data({ clientErrors: parsed.errors }, { status: 400 });
    const created = await createClient(parsed.content);
    if (!created.ok) return data({ clientErrors: created.errors }, { status: 400 });
    clientId = created.client.id;
  } else {
    clientId = Number(form.get("clientId"));
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return data({ selectError: "Selecione um cliente." }, { status: 400 });
    }
  }

  const quotation = await createQuotation({ clientId, ownerUserId: user.id });
  return redirect(`/admin/quotations/${quotation.id}`);
};

export default function NewQuotationPage() {
  const { clients, preselectedClientId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

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
      </div>

      {clients.length > 0 ? (
        <Form method="post" className="grid grid-cols-1 gap-4 border border-border p-4">
          <input type="hidden" name="mode" value="existing" />
          <div className="grid gap-1">
            <Label htmlFor="clientId">Cliente</Label>
            <select
              id="clientId"
              name="clientId"
              required
              defaultValue={preselectedClientId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {formatCityState(client)}
                </option>
              ))}
            </select>
            {actionData && "selectError" in actionData ? <p className="text-sm text-destructive">{actionData.selectError}</p> : null}
          </div>
          <Button type="submit">Abrir editor</Button>
        </Form>
      ) : null}

      <Form method="post" className="grid grid-cols-1 gap-4 border border-border p-4">
        <input type="hidden" name="mode" value="new" />
        <h2 className="font-display text-lg font-semibold">{clients.length > 0 ? "Ou cadastre um cliente novo" : "Cadastre o cliente"}</h2>
        <ClientFormFields idPrefix="new-client" errors={actionData && "clientErrors" in actionData ? actionData.clientErrors : undefined} />
        <Button type="submit" variant={clients.length > 0 ? "outline" : "default"}>
          Cadastrar e abrir editor
        </Button>
      </Form>
    </main>
  );
}
