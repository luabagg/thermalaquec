import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction, SerializeFrom } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import { Await, Form, Link, useLoaderData } from "@remix-run/react";
import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
import { Suspense, useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";

import { CatalogPicker } from "~/admin/quotations/editor/CatalogPicker";
import { toCatalogVariantOptions } from "~/admin/quotations/editor/catalog-variant-options";
import { LineDraftRow, PaymentOptionDraftRow } from "~/admin/quotations/editor/DraftRows";
import {
  applyDraftEdit,
  blankLineDraft,
  blankPaymentOptionDraft,
  catalogVariantToLineDraft,
  draftToDocument,
  storedQuotationToDraft,
} from "~/admin/quotations/editor/quotation-draft";
import { QuotationClientField } from "~/admin/quotations/editor/QuotationClientField";
import { QuotationPreview } from "~/admin/quotations/editor/QuotationPreview";
import type { SaveResponse } from "~/admin/quotations/editor/save-revisions";
import { useLineImageUpload } from "~/admin/quotations/editor/useLineImageUpload";
import { useQuotationSaving, type SaveIntent } from "~/admin/quotations/editor/useQuotationSaving";
import { salesRepForAdmin } from "~/admin/quotations/issuer";
import { QUOTATION_FIELD, parseQuotationForm } from "~/admin/quotations/quotation-form";
import { getQuotation, saveQuotation } from "~/admin/quotations/quotation.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { cn } from "~/lib/utils";
import { listCatalogCategories, listProductsForQuotation } from "~/admin/catalog/catalog.server";
import { listClientsForQuotation } from "~/admin/clients/client.server";
import quotationStyles from "~/styles/quotation-document.css?url";
import { requireAdmin } from "~/utils/require-admin.server";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: quotationStyles }];

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(`Orçamento nº ${data?.quotation.id ?? ""} | ${SITE_NAME}`);

async function loadCatalog() {
  const [products, categories] = await Promise.all([listProductsForQuotation(), listCatalogCategories()]);
  return { options: toCatalogVariantOptions(products), categories };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw redirect("/admin/quotations");
  // Not awaited: the catalog streams in after the editor renders.
  const catalog = loadCatalog();
  const [quotation, clients] = await Promise.all([getQuotation(id, user.id), listClientsForQuotation()]);
  if (!quotation) throw new Response("Not found", { status: 404 });
  return { quotation, clients, catalog, salesRep: salesRepForAdmin(user.email) };
};

function isSaveIntent(intent: string): intent is SaveIntent {
  return intent === "save" || intent === "save-print" || intent === "autosave";
}

function saveFailed(status: number, error: string, revision: number) {
  return data<SaveResponse>({ ok: false, status, error, revision }, { status });
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const id = Number(params.id);
  const form = await request.formData();
  const intent = String(form.get("intent") || "save");
  const revision = Number(form.get("revision")) || 0;
  if (!Number.isInteger(id) || !isSaveIntent(intent)) return saveFailed(400, "Pedido inválido.", revision);
  const content = parseQuotationForm(form);
  if ("error" in content) return saveFailed(400, content.error, revision);

  const result = await saveQuotation({ quotationId: id, ownerUserId: user.id, ...content });
  if (!result.ok) return saveFailed(result.status, result.error, revision);
  const redirectTo = intent === "save-print" ? `/admin/quotations/${id}/print?autoprint=1` : undefined;
  return data<SaveResponse>({ ok: true, revision, ...(redirectTo ? { redirectTo } : {}) });
};

/** The editor keeps its own draft; its saves never need the loader again. Client edits do. */
export const shouldRevalidate = ({ actionResult, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) => {
  if (actionResult && typeof actionResult === "object" && "ok" in actionResult) return false;
  return defaultShouldRevalidate;
};

export default function QuotationEditorPage() {
  const loaded = useLoaderData<typeof loader>();
  // Another quotation gets a fresh editor. A revalidation after a client edit keeps the key, so unsaved work stays.
  return <QuotationEditor key={loaded.quotation.id} {...loaded} />;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

type Pane = "edit" | "preview";

function QuotationEditor({ quotation, clients, catalog, salesRep }: SerializeFrom<typeof loader>) {
  const [draft, dispatch] = useReducer(applyDraftEdit, quotation, storedQuotationToDraft);
  const [pane, setPane] = useState<Pane>("edit");
  const isWide = useMediaQuery("(min-width: 1024px)");
  const formRef = useRef<HTMLFormElement>(null);
  const lineImage = useLineImageUpload(dispatch);
  const uploading = lineImage.uploadingKey !== null;
  const saving = useQuotationSaving(formRef, { autosave: draft.status === "draft", blocked: uploading });
  const busy = saving.saving || uploading;

  // Every edit goes through the reducer, so a new draft object means an edit. Mark it after the commit,
  // when the form in the DOM holds it.
  const { markEdited } = saving;
  const markedDraftRef = useRef(draft);
  useEffect(() => {
    if (markedDraftRef.current === draft) return;
    markedDraftRef.current = draft;
    markEdited();
  }, [draft, markEdited]);

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    saving.save(submitter?.value === "save-print" ? "save-print" : "save");
  }

  const client = clients.find((candidate) => candidate.id === draft.clientId) ?? quotation.client;
  const preview = useMemo(() => draftToDocument(draft, client, salesRep), [draft, client, salesRep]);

  return (
    <div className="min-h-screen bg-secondary/60 print:min-h-0 print:bg-white">
      <EditorTopBar quotationId={quotation.id} clientName={client.name} pane={pane} onPaneChange={setPane} />

      {/* Zero-minimum columns: a long client or item name wraps or truncates instead of widening the page. */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] print:block print:max-w-none print:p-0">
        <Form
          method="post"
          ref={formRef}
          onSubmit={handleFormSubmit}
          className={cn("no-print space-y-6 self-start border border-border bg-white p-4", pane !== "edit" && "hidden lg:block")}
        >
          <input type="hidden" name={QUOTATION_FIELD.lineCount} value={draft.lines.length} />
          <input type="hidden" name={QUOTATION_FIELD.paymentOptionCount} value={draft.paymentOptions.length} />

          {saving.saveError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{saving.saveError}</p>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Cabeçalho</h2>
            <QuotationClientField
              clients={clients}
              clientId={draft.clientId}
              onClientChange={(clientId) => dispatch({ type: "edit-header", patch: { clientId } })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="issuedAt">Data</Label>
                <Input
                  id="issuedAt"
                  name={QUOTATION_FIELD.issuedAt}
                  type="date"
                  value={draft.issuedAt}
                  onChange={(e) => dispatch({ type: "edit-header", patch: { issuedAt: e.target.value } })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name={QUOTATION_FIELD.status}
                  value={draft.status}
                  onChange={(e) => dispatch({ type: "edit-header", patch: { status: e.target.value as "draft" | "final" } })}
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
              <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "add-lines", lines: [blankLineDraft()] })}>
                + Linha avulsa
              </Button>
            </div>
            <Suspense fallback={<CatalogPicker options={null} categories={[]} onAdd={() => {}} />}>
              <Await
                resolve={catalog}
                errorElement={<p className="text-sm text-destructive">Não foi possível carregar o catálogo. Recarregue a página.</p>}
              >
                {(loadedCatalog) => (
                  <CatalogPicker
                    options={loadedCatalog.options}
                    categories={loadedCatalog.categories}
                    onAdd={(options) => dispatch({ type: "add-lines", lines: options.map(catalogVariantToLineDraft) })}
                  />
                )}
              </Await>
            </Suspense>
            {draft.lines.map((line, index) => (
              <LineDraftRow
                key={line.draftKey}
                line={line}
                index={index}
                busy={busy}
                uploading={lineImage.uploadingKey === line.draftKey}
                uploadError={lineImage.errors[line.draftKey]}
                onEdit={dispatch}
                onUpload={lineImage.upload}
              />
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Notas / garantia</h2>
            <textarea
              name={QUOTATION_FIELD.notes}
              rows={5}
              value={draft.notes}
              onChange={(e) => dispatch({ type: "edit-header", patch: { notes: e.target.value } })}
              placeholder="Uma linha por item"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Formas de pagamento</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: "add-payment-option", option: blankPaymentOptionDraft() })}
              >
                + Pagamento
              </Button>
            </div>
            {draft.paymentOptions.map((option, index) => (
              <PaymentOptionDraftRow key={option.draftKey} option={option} index={index} onEdit={dispatch} />
            ))}
          </section>

          <SaveButtons busy={busy} savedHint={saving.savedHint} isDraft={draft.status === "draft"} />
        </Form>

        <div className={cn("space-y-3 self-start lg:sticky lg:top-4 print:static", pane !== "preview" && "hidden lg:block print:block")}>
          {isWide || pane === "preview" ? (
            <div className="flex justify-center border border-border bg-zinc-200/60 p-2 print:border-0 print:bg-white print:p-0 sm:p-4">
              <QuotationPreview {...preview} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type EditorTopBarProps = { quotationId: number; clientName: string; pane: Pane; onPaneChange(pane: Pane): void };

function EditorTopBar({ quotationId, clientName, pane, onPaneChange }: EditorTopBarProps) {
  return (
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
            Orçamento nº {quotationId} · {clientName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Narrow screens show one pane at a time. */}
          <div className="flex gap-2 lg:hidden">
            <Button type="button" variant={pane === "edit" ? "default" : "outline"} size="sm" onClick={() => onPaneChange("edit")}>
              Editar
            </Button>
            <Button type="button" variant={pane === "preview" ? "default" : "outline"} size="sm" onClick={() => onPaneChange("preview")}>
              Ver prévia
            </Button>
          </div>
          <Button asChild variant="outline">
            <Link to={`/admin/quotations/${quotationId}/print`} target="_blank" rel="noreferrer">
              Abrir impressão
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaveButtons({ busy, savedHint, isDraft }: { busy: boolean; savedHint: string | null; isDraft: boolean }) {
  const hint = savedHint ?? (isDraft ? "Rascunho salvo a cada 2 min" : null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" name="intent" value="save" disabled={busy}>
        Salvar
      </Button>
      <Button type="submit" name="intent" value="save-print" variant="outline" disabled={busy}>
        Salvar e imprimir
      </Button>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
