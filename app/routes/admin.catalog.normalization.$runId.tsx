import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import {
  getCatalogNormalizationRevertEligibility,
  getCatalogNormalizationRunSummary,
  revertCatalogNormalizationRun,
} from "~/models/catalog-normalization.server";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () =>
  buildNoIndexMeta(`Normalização | Catálogo | ${SITE_NAME}`);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const runId = Number(params.runId);
  if (!Number.isFinite(runId)) throw new Response("Not Found", { status: 404 });

  const [summary, eligibility] = await Promise.all([
    getCatalogNormalizationRunSummary(runId),
    getCatalogNormalizationRevertEligibility(runId),
  ]);
  if (!summary) throw new Response("Not Found", { status: 404 });
  if ("error" in eligibility) {
    if (eligibility.error === "not_found") throw new Response("Not Found", { status: 404 });
    throw new Response("Execução indisponível", { status: 400 });
  }

  return json({ runId, summary, eligibility });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const runId = Number(params.runId);
  if (!Number.isFinite(runId)) return json({ error: "Execução não encontrada" }, { status: 404 });

  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  if (intent !== "revert") return json({ error: "Ação inválida" }, { status: 400 });

  const result = await revertCatalogNormalizationRun(runId);
  if (!result.ok) {
    if (result.error === "unsafe_revert") {
      const eligibility = await getCatalogNormalizationRevertEligibility(runId);
      if ("error" in eligibility) {
        return json({ error: "Não é seguro reverter esta execução." }, { status: 409 });
      }
      return json(
        {
          error: "Não é seguro reverter esta execução.",
          postRunQuotationLineCount: eligibility.postRunQuotationLineCount,
          editedFamilyCount: eligibility.editedFamilyCount,
        },
        { status: 409 },
      );
    }
    if (result.error === "not_found") return json({ error: "Execução não encontrada" }, { status: 404 });
    return json({ error: "Não foi possível reverter esta execução." }, { status: 400 });
  }

  return json({ ok: true, result });
};

export default function AdminCatalogNormalizationRun() {
  const { runId, summary, eligibility } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-grow flex-col gap-8 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/admin" className="underline-offset-2 hover:underline">
            Admin
          </Link>{" "}
          /{" "}
          <Link to="/admin/catalog" className="underline-offset-2 hover:underline">
            Catálogo
          </Link>{" "}
          / Normalização #{runId}
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Execução de normalização #{runId}</h1>
      </div>

      <section className="grid gap-2 border border-border p-4 text-sm">
        <h2 className="text-lg font-semibold">Resumo da execução</h2>
        <p><strong>Status:</strong> {summary.status}</p>
        <p><strong>Criada em:</strong> {new Date(summary.createdAt).toLocaleString("pt-BR")}</p>
        {summary.appliedAt ? <p><strong>Aplicada em:</strong> {new Date(summary.appliedAt).toLocaleString("pt-BR")}</p> : null}
        {summary.revertedAt ? <p><strong>Revertida em:</strong> {new Date(summary.revertedAt).toLocaleString("pt-BR")}</p> : null}
        {summary.result && typeof summary.result === "object" && !Array.isArray(summary.result) ? (
          <dl className="grid grid-cols-2 gap-1">
            {Object.entries(summary.result).map(([label, value]) => (
              typeof value === "number" || typeof value === "string" ? (
                <div key={label} className="contents"><dt>{label}</dt><dd>{String(value)}</dd></div>
              ) : null
            ))}
          </dl>
        ) : null}
      </section>

      <section className="grid gap-3 border border-border p-4 text-sm">
        <h2 className="text-lg font-semibold">Elegibilidade de reversão</h2>
        {eligibility.eligible ? (
          <p className="text-muted-foreground">Esta execução pode ser revertida com segurança.</p>
        ) : (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <p className="font-medium">Reversão insegura</p>
            <ul className="mt-2 list-disc pl-5">
              <li>{eligibility.postRunQuotationLineCount} linhas de orçamento alteradas após a execução</li>
              <li>{eligibility.editedFamilyCount} famílias canônicas editadas após a execução</li>
            </ul>
          </div>
        )}
      </section>

      {actionData && "error" in actionData ? (
        <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionData.error}
          {"postRunQuotationLineCount" in actionData &&
          "editedFamilyCount" in actionData ? (
            <>
              {" "}
              ({actionData.postRunQuotationLineCount} linhas, {actionData.editedFamilyCount} famílias editadas)
            </>
          ) : null}
        </p>
      ) : null}

      {actionData && "ok" in actionData && actionData.ok ? (
        <p className="rounded border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          Execução revertida com sucesso.
        </p>
      ) : null}

      <Form method="post">
        <input type="hidden" name="intent" value="revert" />
        <Button type="submit" disabled={!eligibility.eligible}>
          Reverter execução
        </Button>
      </Form>
    </main>
  );
}
