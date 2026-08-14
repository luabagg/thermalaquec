import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { cn } from "~/lib/utils";
import { deleteQuotation, listQuotations } from "~/models/quotation.server";
import { formatBRL, quotationTotalCents } from "~/utils/quotation";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Orçamentos | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const quotations = await listQuotations(user.id);
  return json({ quotations });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const id = Number(form.get("id"));
  if (!Number.isFinite(id)) return json({ error: "Invalid" }, { status: 400 });
  if (intent === "delete") {
    const deleted = await deleteQuotation(id, user.id);
    if (!deleted) return json({ error: "Not found" }, { status: 404 });
    return json({ ok: true });
  }
  return json({ error: "Unknown" }, { status: 400 });
};

function StatusBadge({ status }: { status: string }) {
  const isFinal = status === "final";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        isFinal ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {isFinal ? "Final" : "Rascunho"}
    </span>
  );
}

export default function AdminQuotations() {
  const { quotations } = useLoaderData<typeof loader>();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-grow flex-col gap-8 px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/admin" className="underline-offset-2 hover:underline">
              Admin
            </Link>{" "}
            / Orçamentos
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold">Orçamentos</h1>
        </div>
        <Button asChild>
          <Link to="/admin/quotations/new">Novo orçamento</Link>
        </Button>
      </div>

      <ul className="divide-y divide-border border border-border">
        {quotations.map((q) => {
          const total = quotationTotalCents(q.lines);
          const issued = new Date(q.issuedAt).toLocaleDateString("pt-BR");
          return (
            <li key={q.id} className="flex items-stretch gap-2 hover:bg-secondary/50">
              <Link
                to={`/admin/quotations/${q.id}`}
                className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{q.title}</p>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {q.client.name} · {issued}
                  </p>
                </div>
                {total > 0 ? <p className="font-medium sm:text-right">{formatBRL(total)}</p> : null}
              </Link>
              <Form
                method="post"
                className="flex items-center pr-4"
                onSubmit={(event) => {
                  if (!confirm("Excluir este orçamento?")) event.preventDefault();
                }}
              >
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={q.id} />
                <Button type="submit" variant="destructive" size="sm">
                  Excluir
                </Button>
              </Form>
            </li>
          );
        })}
        {quotations.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted-foreground">Nenhum orçamento ainda.</li>
        ) : null}
      </ul>
    </main>
  );
}
