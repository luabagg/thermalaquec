import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";

import { ClientFormFields } from "~/components/admin/ClientFormFields";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { deleteClient, getClient, updateClient } from "~/models/client.server";
import { parseClientForm } from "~/utils/client";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(`${data?.client.name ?? "Cliente"} | ${SITE_NAME}`);

function clientId(raw: string | undefined) {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new Response("Not found", { status: 404 });
  return id;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const client = await getClient(clientId(params.id));
  if (!client) throw new Response("Not found", { status: 404 });
  const { quotations, ...rest } = client;
  return {
    client: rest,
    // Quotations belong to their author; other authors' quotations only block the delete.
    ownQuotations: quotations.filter((quotation) => quotation.ownerUserId === user.id),
    quotationCount: quotations.length,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const id = clientId(params.id);
  const form = await request.formData();

  if (form.get("intent") === "delete") {
    const result = await deleteClient(id);
    if (result.ok) return redirect("/admin/clients");
    return data({ error: "Este cliente tem orçamentos e não pode ser excluído.", fieldErrors: undefined }, { status: 409 });
  }

  const parsed = parseClientForm(form);
  if (!parsed.ok) return data({ fieldErrors: parsed.fieldErrors, error: undefined }, { status: 400 });
  const result = await updateClient(id, parsed.data);
  if (!result.ok) return data({ fieldErrors: result.fieldErrors, error: undefined }, { status: 400 });
  return data({ saved: true, fieldErrors: undefined, error: undefined });
};

export default function AdminClient() {
  const { client, ownQuotations, quotationCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const saving = navigation.state === "submitting";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-grow flex-col gap-6 px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/admin/clients" className="underline-offset-2 hover:underline">
              Clientes
            </Link>{" "}
            / Editar
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold">{client.name}</h1>
        </div>
        <Button asChild>
          <Link to={`/admin/quotations/new?clientId=${client.id}`}>Novo orçamento</Link>
        </Button>
      </div>

      {/* Remount after a save so the fields show what was stored. */}
      <Form method="post" key={client.updatedAt.toString()} className="grid gap-4 border border-border p-4">
        <ClientFormFields defaultValues={client} fieldErrors={actionData?.fieldErrors} />
        <div className="flex items-center gap-3">
          <Button type="submit" name="intent" value="update" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          {actionData && "saved" in actionData ? (
            <p role="status" className="text-sm text-muted-foreground">
              Cliente salvo.
            </p>
          ) : null}
        </div>
      </Form>

      <section className="grid gap-2">
        <h2 className="font-display text-lg font-semibold">Orçamentos</h2>
        <ul className="divide-y divide-border border border-border">
          {ownQuotations.map((quotation) => (
            <li key={quotation.id}>
              <Link to={`/admin/quotations/${quotation.id}`} className="flex justify-between px-4 py-3 hover:bg-secondary/50">
                <span>Orçamento nº {quotation.id}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(quotation.issuedAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })} ·{" "}
                  {quotation.status === "final" ? "Final" : "Rascunho"}
                </span>
              </Link>
            </li>
          ))}
          {ownQuotations.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum orçamento seu para este cliente.</li>
          ) : null}
        </ul>
      </section>

      <Form
        method="post"
        className="flex flex-wrap items-center gap-3 border border-destructive/30 p-4"
        onSubmit={(event) => {
          if (!confirm(`Excluir o cliente ${client.name}?`)) event.preventDefault();
        }}
      >
        <Button type="submit" name="intent" value="delete" variant="destructive" disabled={quotationCount > 0 || saving}>
          Excluir cliente
        </Button>
        <p className="text-sm text-muted-foreground">
          {quotationCount > 0 ? "Clientes com orçamentos não podem ser excluídos." : "Esta ação não pode ser desfeita."}
        </p>
        {actionData?.error ? (
          <p role="alert" className="w-full text-sm text-destructive">
            {actionData.error}
          </p>
        ) : null}
      </Form>
    </main>
  );
}
