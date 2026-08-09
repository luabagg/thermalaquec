import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import { QuotationDocument } from "~/components/admin/QuotationDocument";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import {
  getQuotation,
  listCatalogItems,
  replacePaymentOptions,
  replaceQuotationLines,
  updateQuotationMeta,
} from "~/models/quotation.server";
import { formatBRL, parseBRLToCents } from "~/utils/quotation";
import quotationStyles from "~/styles/quotation-document.css?url";
import { requireAdmin } from "~/utils/require-admin.server";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: quotationStyles }];

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(`${data?.quotation.title ?? "Orçamento"} | ${SITE_NAME}`);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw redirect("/admin/quotations");
  const quotation = await getQuotation(id);
  if (!quotation) throw new Response("Not found", { status: 404 });
  const catalog = await listCatalogItems();
  return json({ quotation, catalog });
};

function parseLinesFromForm(form: FormData) {
  const count = Number(form.get("lineCount") || 0);
  const lines = [];
  for (let i = 0; i < count; i++) {
    const name = String(form.get(`line.${i}.name`) || "").trim();
    if (!name) continue;
    const quantity = Math.max(1, Number(form.get(`line.${i}.quantity`) || 1));
    const desc = String(form.get(`line.${i}.description`) || "");
    const descriptionLines = desc
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const priceRaw = String(form.get(`line.${i}.price`) || "0");
    const unitPriceCents = parseBRLToCents(priceRaw) ?? 0;
    const catalogRaw = form.get(`line.${i}.catalogItemId`);
    const catalogItemId = catalogRaw ? Number(catalogRaw) : null;
    lines.push({
      name,
      quantity,
      descriptionLines,
      unitPriceCents,
      catalogItemId: Number.isFinite(catalogItemId as number) ? catalogItemId : null,
    });
  }
  return lines;
}

function parsePaymentsFromForm(form: FormData) {
  const count = Number(form.get("paymentCount") || 0);
  const options = [];
  for (let i = 0; i < count; i++) {
    const label = String(form.get(`pay.${i}.label`) || "").trim();
    if (!label) continue;
    const amountCents = parseBRLToCents(String(form.get(`pay.${i}.amount`) || "0")) ?? 0;
    const detail = String(form.get(`pay.${i}.detail`) || "") || null;
    options.push({ label, amountCents, detail });
  }
  return options;
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "Invalid id" }, { status: 400 });

  const form = await request.formData();
  const intent = String(form.get("intent") || "save");

  if (intent === "add-from-catalog") {
    const catalogItemId = Number(form.get("catalogItemId"));
    const quotation = await getQuotation(id);
    if (!quotation) return json({ error: "Not found" }, { status: 404 });
    const catalog = await listCatalogItems();
    const item = catalog.find((c) => c.id === catalogItemId);
    if (!item) return json({ error: "Item não encontrado" }, { status: 400 });

    const existing = quotation.lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      descriptionLines: (Array.isArray(l.descriptionLines) ? l.descriptionLines : []) as string[],
      unitPriceCents: l.unitPriceCents,
      catalogItemId: l.catalogItemId,
    }));
    existing.push({
      name: item.name,
      quantity: 1,
      descriptionLines: (Array.isArray(item.descriptionLines) ? item.descriptionLines : []) as string[],
      unitPriceCents: item.defaultUnitPriceCents ?? 0,
      catalogItemId: item.id,
    });
    await replaceQuotationLines(id, existing);
    return redirect(`/admin/quotations/${id}`);
  }

  if (intent === "add-blank-line") {
    const quotation = await getQuotation(id);
    if (!quotation) return json({ error: "Not found" }, { status: 404 });
    const existing = quotation.lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      descriptionLines: (Array.isArray(l.descriptionLines) ? l.descriptionLines : []) as string[],
      unitPriceCents: l.unitPriceCents,
      catalogItemId: l.catalogItemId,
    }));
    existing.push({
      name: "Novo item",
      quantity: 1,
      descriptionLines: [],
      unitPriceCents: 0,
      catalogItemId: null,
    });
    await replaceQuotationLines(id, existing);
    return redirect(`/admin/quotations/${id}`);
  }

  if (intent === "add-payment") {
    const quotation = await getQuotation(id);
    if (!quotation) return json({ error: "Not found" }, { status: 404 });
    const existing = quotation.paymentOptions.map((p) => ({
      label: p.label,
      amountCents: p.amountCents,
      detail: p.detail,
    }));
    existing.push({ label: "À vista", amountCents: 0, detail: null });
    await replacePaymentOptions(id, existing);
    return redirect(`/admin/quotations/${id}`);
  }

  const issuedRaw = String(form.get("issuedAt") || "");
  const issuedAt = issuedRaw ? new Date(issuedRaw + "T12:00:00") : undefined;

  await updateQuotationMeta(id, {
    title: String(form.get("title") || ""),
    notes: String(form.get("notes") || "") || null,
    status: String(form.get("status") || "draft") === "final" ? "final" : "draft",
    issuedAt,
    clientLocation: String(form.get("location") || "") || null,
    clientDocument: String(form.get("document") || "") || null,
  });

  await replaceQuotationLines(id, parseLinesFromForm(form));
  await replacePaymentOptions(id, parsePaymentsFromForm(form));

  if (intent === "save-print") {
    return redirect(`/admin/quotations/${id}/print`);
  }

  return redirect(`/admin/quotations/${id}?saved=1`);
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function QuotationBuilder() {
  const { quotation, catalog } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const issuedValue = new Date(quotation.issuedAt).toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-secondary/60">
      <div className="no-print border-b border-border bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">
              <Link to="/admin/quotations" className="underline-offset-2 hover:underline">
                Orçamentos
              </Link>{" "}
              / Builder
            </p>
            <h1 className="font-display text-xl font-bold">{quotation.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={`/admin/quotations/${quotation.id}/print`} target="_blank" rel="noreferrer">
                Abrir impressão
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <Form method="post" className="no-print space-y-6 self-start border border-border bg-white p-4">
          <input type="hidden" name="intent" value="save" />
          <input type="hidden" name="lineCount" value={quotation.lines.length} />
          <input type="hidden" name="paymentCount" value={quotation.paymentOptions.length} />

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Cabeçalho</h2>
            <div>
              <Label htmlFor="title">Título / Cliente</Label>
              <Input id="title" name="title" defaultValue={quotation.title} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="issuedAt">Data</Label>
                <Input id="issuedAt" name="issuedAt" type="date" defaultValue={issuedValue} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={quotation.status}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="final">final</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="location">Local (opcional)</Label>
              <Input id="location" name="location" defaultValue={quotation.client.location ?? ""} />
            </div>
            <div>
              <Label htmlFor="document">CPF/CNPJ (opcional)</Label>
              <Input id="document" name="document" defaultValue={quotation.client.document ?? ""} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Itens</h2>
            {quotation.lines.map((line, i) => (
              <div key={line.id} className="space-y-2 border border-border p-3">
                <p className="text-xs text-muted-foreground">#{i + 1}</p>
                <input type="hidden" name={`line.${i}.catalogItemId`} value={line.catalogItemId ?? ""} />
                <Input name={`line.${i}.name`} defaultValue={line.name} placeholder="Item" required />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    name={`line.${i}.quantity`}
                    type="number"
                    min={1}
                    defaultValue={line.quantity}
                    placeholder="Qtd"
                  />
                  <Input
                    name={`line.${i}.price`}
                    defaultValue={centsToInput(line.unitPriceCents)}
                    placeholder="Preço unit."
                  />
                </div>
                <textarea
                  name={`line.${i}.description`}
                  rows={3}
                  defaultValue={(Array.isArray(line.descriptionLines) ? line.descriptionLines : []).join(
                    "\n",
                  )}
                  placeholder="Descrição (uma linha por bullet)"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-right text-sm text-heat">
                  Valor: {formatBRL(line.quantity * line.unitPriceCents)}
                </p>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Notas / garantia</h2>
            <textarea
              name="notes"
              rows={4}
              defaultValue={quotation.notes ?? ""}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Formas de pagamento</h2>
            {quotation.paymentOptions.map((opt, i) => (
              <div key={opt.id} className="space-y-2 border border-border p-3">
                <Input name={`pay.${i}.label`} defaultValue={opt.label} placeholder="Rótulo" />
                <Input
                  name={`pay.${i}.amount`}
                  defaultValue={centsToInput(opt.amountCents)}
                  placeholder="Valor total da opção"
                />
                <Input name={`pay.${i}.detail`} defaultValue={opt.detail ?? ""} placeholder="Detalhe (opcional)" />
              </div>
            ))}
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              Salvar
            </Button>
            <Button type="submit" name="intent" value="save-print" variant="outline" disabled={busy}>
              Salvar e imprimir
            </Button>
          </div>
        </Form>

        <div className="no-print space-y-3 self-start lg:sticky lg:top-4">
          <div className="flex flex-wrap gap-2 border border-border bg-white p-3">
            <Form method="post">
              <input type="hidden" name="intent" value="add-blank-line" />
              <Button type="submit" variant="outline" size="sm">
                + Linha avulsa
              </Button>
            </Form>
            <Form method="post">
              <input type="hidden" name="intent" value="add-payment" />
              <Button type="submit" variant="outline" size="sm">
                + Pagamento
              </Button>
            </Form>
            <Form method="post" className="flex flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="intent" value="add-from-catalog" />
              <select
                name="catalogItemId"
                className="h-9 min-w-[12rem] flex-1 rounded-md border border-input bg-background px-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Do catálogo…
                </option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" disabled={catalog.length === 0}>
                Adicionar
              </Button>
            </Form>
          </div>

          <div className="overflow-auto border border-border bg-zinc-200/60 p-4">
            <QuotationDocument
              title={quotation.title}
              issuedAt={quotation.issuedAt}
              client={quotation.client}
              lines={quotation.lines}
              paymentOptions={quotation.paymentOptions}
              notes={quotation.notes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
