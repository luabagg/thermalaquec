import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { formatBRL, listQuotations, quotationTotalCents } from "~/models/quotation.server";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Orçamentos | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const quotations = await listQuotations();
  return json({ quotations });
};

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
            <li key={q.id}>
              <Link
                to={`/admin/quotations/${q.id}`}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{q.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {q.client.name} · {issued} · {q.status}
                  </p>
                </div>
                <p className="font-medium">{formatBRL(total)}</p>
              </Link>
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
