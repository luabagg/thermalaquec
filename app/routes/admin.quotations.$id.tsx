import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import { Await, Form, Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { CatalogPicker } from "~/components/admin/CatalogPicker";
import { EditorClientSection } from "~/components/admin/EditorClientSection";
import {
  QuotationEditorLineRow,
  QuotationEditorPaymentRow,
  type QuotationEditorLine,
  type QuotationEditorPayment,
} from "~/components/admin/QuotationEditorRows";
import { QuotationPreview } from "~/components/admin/QuotationPreview";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME, resolveQuoteRep } from "~/lib/site";
import { cn } from "~/lib/utils";
import { listCatalogCategories, listCatalogPickerProducts } from "~/models/catalog.server";
import { listClientOptions } from "~/models/client.server";
import { getQuotation, saveQuotation, type QuotationDocumentRecord } from "~/models/quotation.server";
import quotationStyles from "~/styles/quotation-document.css?url";
import { toCatalogPickerItems, type CatalogPickerItem } from "~/utils/catalog-picker";
import { parseBRLToCents } from "~/utils/quotation";
import { updateEditorRow } from "~/utils/quotation-editor-state";
import { parseQuotationForm, splitBullets } from "~/utils/quotation-form";
import {
  beginRevisionSave,
  completeRevisionSave,
  initialRevisionState,
  markRevisionEdited,
} from "~/utils/quotation-revision";
import { requireAdmin } from "~/utils/require-admin.server";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: quotationStyles }];

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(`Orçamento nº ${data?.quotation.id ?? ""} | ${SITE_NAME}`);

async function loadCatalog() {
  const [products, categories] = await Promise.all([listCatalogPickerProducts(), listCatalogCategories()]);
  return { items: toCatalogPickerItems(products), categories };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw redirect("/admin/quotations");
  // Not awaited: the catalog streams in after the editor renders.
  const catalog = loadCatalog();
  const [quotation, clients] = await Promise.all([getQuotation(id, user.id), listClientOptions()]);
  if (!quotation) throw new Response("Not found", { status: 404 });
  return { quotation, clients, catalog, rep: resolveQuoteRep(user.email) };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const id = Number(params.id);
  const form = await request.formData();
  const intent = String(form.get("intent") || "save");
  const revision = Number(form.get("revision")) || 0;
  if (!Number.isInteger(id) || (intent !== "save" && intent !== "save-print" && intent !== "autosave")) {
    return data({ ok: false as const, status: 400, error: "Pedido inválido.", revision }, { status: 400 });
  }
  const parsed = parseQuotationForm(form);
  if ("error" in parsed) return data({ ok: false as const, status: 400, error: parsed.error, revision }, { status: 400 });

  const result = await saveQuotation({ quotationId: id, ownerUserId: user.id, ...parsed });
  if (!result.ok) return data({ ok: false as const, status: result.status, error: result.error, revision }, { status: result.status });
  return data({
    ok: true as const,
    quotationId: id,
    revision,
    ...(intent === "save-print" ? { redirectTo: `/admin/quotations/${id}/print?autoprint=1` } : {}),
  });
};

/** The editor keeps its own draft; its saves never need the loader again. Client edits do. */
export const shouldRevalidate = ({ actionResult, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) => {
  if (actionResult && typeof actionResult === "object" && "ok" in actionResult) return false;
  return defaultShouldRevalidate;
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function newClientKey() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function bulletsOf(raw: unknown) {
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

function lineToDraft(line: QuotationDocumentRecord["lines"][number]): QuotationEditorLine {
  return {
    clientKey: String(line.id),
    name: line.name,
    quantity: line.quantity,
    description: bulletsOf(line.descriptionLines).join("\n"),
    priceInput: centsToInput(line.unitPriceCents),
    unitPriceCents: line.unitPriceCents,
    catalogVariantId: line.catalogVariantId,
    imageId: line.imageId,
    imageUrl: line.image?.location ?? null,
    imageThumbnail: line.image?.thumbnail ?? null,
    openOnMount: false,
  };
}

function catalogItemToDraft(item: CatalogPickerItem): QuotationEditorLine {
  return {
    clientKey: newClientKey(),
    name: item.name,
    quantity: 1,
    description: item.descriptionLines.join("\n"),
    priceInput: centsToInput(item.unitPriceCents ?? 0),
    unitPriceCents: item.unitPriceCents ?? 0,
    catalogVariantId: item.variantId,
    imageId: item.imageId,
    imageUrl: item.imageUrl,
    imageThumbnail: item.imageThumbnail,
    openOnMount: false,
  };
}

function paymentToDraft(option: QuotationDocumentRecord["paymentOptions"][number]): QuotationEditorPayment {
  return {
    clientKey: String(option.id),
    label: option.label,
    amountInput: centsToInput(option.amountCents),
    amountCents: option.amountCents,
    detail: option.detail ?? "",
  };
}

function toDateInput(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

const AUTOSAVE_EVERY_MS = 2 * 60 * 1000;

export default function QuotationBuilder() {
  const { quotation, clients, catalog, rep } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const quotationId = quotation.id;

  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [isLg, setIsLg] = useState(false);
  const [clientId, setClientId] = useState(quotation.client.id);
  const [issuedAt, setIssuedAt] = useState(() => toDateInput(quotation.issuedAt));
  const [status, setStatus] = useState(quotation.status);
  const [notes, setNotes] = useState(quotation.notes ?? "");
  const [lines, setLines] = useState<QuotationEditorLine[]>(() => quotation.lines.map(lineToDraft));
  const [payments, setPayments] = useState<QuotationEditorPayment[]>(() => quotation.paymentOptions.map(paymentToDraft));
  const [lineUploadErrors, setLineUploadErrors] = useState<Record<string, string>>({});
  const [lineUploadingKey, setLineUploadingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [autosaveHint, setAutosaveHint] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const saveFetcher = useFetcher<typeof action>();
  const saveFetcherRef = useRef(saveFetcher);
  const revisionStateRef = useRef(initialRevisionState());
  const ignoreDirtyUntilRef = useRef(1);
  const lineUploadingKeyRef = useRef<string | null>(null);
  saveFetcherRef.current = saveFetcher;
  lineUploadingKeyRef.current = lineUploadingKey;
  const busy = saveFetcher.state !== "idle" || lineUploadingKey !== null;

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // Reset the draft only when another quotation opens. A revalidation after a client edit must keep unsaved work.
  const loadedIdRef = useRef(quotationId);
  useEffect(() => {
    if (loadedIdRef.current === quotationId) return;
    loadedIdRef.current = quotationId;
    ignoreDirtyUntilRef.current = 1;
    revisionStateRef.current = initialRevisionState();
    setAutosaveHint(null);
    setClientId(quotation.client.id);
    setIssuedAt(toDateInput(quotation.issuedAt));
    setStatus(quotation.status);
    setNotes(quotation.notes ?? "");
    setLines(quotation.lines.map(lineToDraft));
    setPayments(quotation.paymentOptions.map(paymentToDraft));
    setActionError(null);
  }, [quotationId, quotation]);

  useEffect(() => {
    if (ignoreDirtyUntilRef.current > 0) {
      ignoreDirtyUntilRef.current -= 1;
      return;
    }
    revisionStateRef.current = markRevisionEdited(revisionStateRef.current);
    setActionError(null);
    setAutosaveHint(null);
  }, [clientId, issuedAt, status, notes, lines, payments]);

  useEffect(() => {
    const data = saveFetcher.data;
    if (saveFetcher.state !== "idle" || !data) return;
    const completion = completeRevisionSave(revisionStateRef.current, data);
    revisionStateRef.current = completion.state;
    if (completion.effect.type === "ignored" || completion.effect.type === "dirty-preserved") return;
    if (completion.effect.type === "error") {
      setActionError(completion.effect.message);
      return;
    }
    setActionError(null);
    if (completion.effect.type === "navigate") {
      navigate(completion.effect.to);
      return;
    }
    setAutosaveHint(`Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
  }, [navigate, saveFetcher.data, saveFetcher.state]);

  const submitQuotation = useCallback((intent: "save" | "save-print" | "autosave") => {
    const form = formRef.current;
    const fetcher = saveFetcherRef.current;
    if (!form || fetcher.state !== "idle" || lineUploadingKeyRef.current !== null) return;
    const begun = beginRevisionSave(revisionStateRef.current);
    revisionStateRef.current = begun.state;
    const body = new FormData(form);
    body.set("intent", intent);
    body.set("revision", String(begun.requestRevision));
    fetcher.submit(body, { method: "post" });
    setActionError(null);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (status !== "draft" || !revisionStateRef.current.dirty) return;
      submitQuotation("autosave");
    }, AUTOSAVE_EVERY_MS);
    return () => window.clearInterval(id);
  }, [status, submitQuotation]);

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    submitQuotation(submitter?.value === "save-print" ? "save-print" : "save");
  }

  const updateLine = useCallback((clientKey: string, patch: Partial<QuotationEditorLine>) => {
    setLines((prev) =>
      updateEditorRow(prev, clientKey, (line) => {
        const next = { ...line, ...patch };
        if (patch.priceInput !== undefined) next.unitPriceCents = parseBRLToCents(patch.priceInput) ?? line.unitPriceCents;
        return next;
      }),
    );
  }, []);

  const updatePayment = useCallback((clientKey: string, patch: Partial<QuotationEditorPayment>) => {
    setPayments((prev) =>
      updateEditorRow(prev, clientKey, (payment) => {
        const next = { ...payment, ...patch };
        if (patch.amountInput !== undefined) next.amountCents = parseBRLToCents(patch.amountInput) ?? payment.amountCents;
        return next;
      }),
    );
  }, []);

  const addBlankLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      {
        clientKey: newClientKey(),
        name: "",
        quantity: 1,
        description: "",
        priceInput: "0,00",
        unitPriceCents: 0,
        catalogVariantId: null,
        imageId: null,
        imageUrl: null,
        imageThumbnail: null,
        openOnMount: true,
      },
    ]);
  }, []);

  const addCatalogItems = useCallback((items: CatalogPickerItem[]) => {
    setLines((current) => [...current, ...items.map(catalogItemToDraft)]);
  }, []);

  const removeLine = useCallback((clientKey: string) => {
    setLines((prev) => prev.filter((line) => line.clientKey !== clientKey));
  }, []);

  const addPayment = useCallback(() => {
    setPayments((prev) => [...prev, { clientKey: newClientKey(), label: "À vista", amountInput: "0,00", amountCents: 0, detail: "" }]);
  }, []);

  const removePayment = useCallback((clientKey: string) => {
    setPayments((prev) => prev.filter((payment) => payment.clientKey !== clientKey));
  }, []);

  const handleLineImageUpload = useCallback(
    async (clientKey: string, file: File) => {
      setLineUploadErrors((prev) => {
        const next = { ...prev };
        delete next[clientKey];
        return next;
      });
      setLineUploadingKey(clientKey);
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("folder", "quotes");
        const res = await fetch("/admin/uploads", { method: "POST", body, credentials: "same-origin" });
        const data = (await res.json()) as { id?: number; location?: string; thumbnail?: string; error?: string };
        if (!res.ok || data.error || data.id == null) {
          setLineUploadErrors((prev) => ({ ...prev, [clientKey]: data.error ?? "Falha no envio da imagem" }));
          return;
        }
        updateLine(clientKey, { imageId: data.id, imageUrl: data.location ?? null, imageThumbnail: data.thumbnail ?? null });
      } catch {
        setLineUploadErrors((prev) => ({ ...prev, [clientKey]: "Falha no envio da imagem" }));
      } finally {
        setLineUploadingKey(null);
      }
    },
    [updateLine],
  );

  const client = clients.find((candidate) => candidate.id === clientId) ?? quotation.client;
  const previewInput = useMemo(
    () => ({
      issuedAt,
      client,
      lines: lines.map((line) => ({
        clientKey: line.clientKey,
        name: line.name,
        quantity: line.quantity,
        descriptionLines: splitBullets(line.description),
        unitPriceCents: line.unitPriceCents,
        imageUrl: line.imageUrl,
        thumbnailUrl: line.imageThumbnail,
      })),
      paymentOptions: payments.map((payment) => ({
        clientKey: payment.clientKey,
        label: payment.label,
        amountCents: payment.amountCents,
        detail: payment.detail || null,
      })),
      notes: notes || null,
      rep,
    }),
    [issuedAt, client, lines, payments, notes, rep],
  );
  const showPreview = isLg || pane === "preview";

  return (
    <div className="min-h-screen bg-secondary/60 print:min-h-0 print:bg-white">
      <div className="no-print border-b border-border bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">
              <Link to="/admin/quotations" className="underline-offset-2 hover:underline">
                Orçamentos
              </Link>{" "}
              / Editor
            </p>
            <h1 className="font-display text-xl font-bold">
              Orçamento nº {quotation.id} · {client.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2 lg:hidden">
              <Button type="button" variant={pane === "edit" ? "default" : "outline"} size="sm" onClick={() => setPane("edit")}>
                Editar
              </Button>
              <Button type="button" variant={pane === "preview" ? "default" : "outline"} size="sm" onClick={() => setPane("preview")}>
                Prévia
              </Button>
            </div>
            <Button asChild variant="outline">
              <Link to={`/admin/quotations/${quotation.id}/print`} target="_blank" rel="noreferrer">
                Abrir impressão
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[minmax(320px,420px)_1fr] print:block print:max-w-none print:p-0">
        <Form
          method="post"
          ref={formRef}
          onSubmit={handleFormSubmit}
          className={cn("no-print space-y-6 self-start border border-border bg-white p-4", pane !== "edit" && "hidden lg:block")}
        >
          <input type="hidden" name="lineCount" value={lines.length} />
          <input type="hidden" name="paymentCount" value={payments.length} />

          {actionError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Cabeçalho</h2>
            <EditorClientSection clients={clients} clientId={clientId} onClientChange={setClientId} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="issuedAt">Data</Label>
                <Input id="issuedAt" name="issuedAt" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "final")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="draft">Rascunho</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Itens</h2>
              <Button type="button" variant="outline" size="sm" onClick={addBlankLine}>
                + Linha avulsa
              </Button>
            </div>
            <Suspense fallback={<CatalogPicker items={null} categories={[]} onAdd={addCatalogItems} />}>
              <Await
                resolve={catalog}
                errorElement={<p className="text-sm text-destructive">Não foi possível carregar o catálogo. Recarregue a página.</p>}
              >
                {(loaded) => <CatalogPicker items={loaded.items} categories={loaded.categories} onAdd={addCatalogItems} />}
              </Await>
            </Suspense>
            {lines.map((line, i) => (
              <QuotationEditorLineRow
                key={line.clientKey}
                line={line}
                index={i}
                busy={busy}
                lineUploading={lineUploadingKey === line.clientKey}
                uploadError={lineUploadErrors[line.clientKey]}
                onRemove={removeLine}
                onChange={updateLine}
                onUpload={handleLineImageUpload}
              />
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Notas / garantia</h2>
            <textarea
              name="notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Uma linha por item"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Formas de pagamento</h2>
              <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                + Pagamento
              </Button>
            </div>
            {payments.map((opt, i) => (
              <QuotationEditorPaymentRow key={opt.clientKey} payment={opt} index={i} onRemove={removePayment} onChange={updatePayment} />
            ))}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" name="intent" value="save" disabled={busy}>
              Salvar
            </Button>
            <Button type="submit" name="intent" value="save-print" variant="outline" disabled={busy}>
              Salvar e imprimir
            </Button>
            {autosaveHint ? (
              <p className="text-xs text-muted-foreground">{autosaveHint}</p>
            ) : status === "draft" ? (
              <p className="text-xs text-muted-foreground">Rascunho salvo a cada 2 min</p>
            ) : null}
          </div>
        </Form>

        <div className={cn("space-y-3 self-start lg:sticky lg:top-4 print:static", pane !== "preview" && "hidden lg:block print:block")}>
          {showPreview ? (
            <div className="overflow-x-auto border border-border bg-zinc-200/60 p-2 print:flex print:justify-center print:overflow-visible print:border-0 print:bg-white print:p-0 sm:p-4">
              <div className="origin-top-left min-w-[320px] print:min-w-0">
                <QuotationPreview {...previewInput} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
