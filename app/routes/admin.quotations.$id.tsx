import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState, type FormEvent, useCallback } from "react";
import {
  CatalogVariationPicker,
  type CatalogPickerAddedDraft,
} from "~/components/admin/CatalogVariationPicker";
import { QuotationEditorLineRow, QuotationEditorPaymentRow } from "~/components/admin/QuotationEditorRows";
import { QuotationPreview } from "~/components/admin/QuotationPreview";
import { Button } from "~/components/ui/button";
import { TaxIdInput } from "~/components/ui/tax-id-input";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME, resolveQuoteRep } from "~/lib/site";
import { loadQuotationEditorData, saveQuotation } from "~/models/quotation.server";
import { parseBRLToCents } from "~/utils/quotation";
import { updateEditorRow } from "~/utils/quotation-editor-state";
import {
  beginRevisionSave,
  completeRevisionSave,
  initialRevisionState,
  markRevisionEdited,
} from "~/utils/quotation-revision";
import quotationStyles from "~/styles/quotation-document.css?url";
import { requireAdmin } from "~/utils/require-admin.server";
import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: quotationStyles }];

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(`${data?.quotation.title ?? "Orçamento"} | ${SITE_NAME}`);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw redirect("/admin/quotations");
  const { quotation, catalog } = await loadQuotationEditorData(user.id, id);
  if (!quotation) throw new Response("Not found", { status: 404 });
  return json({ quotation, catalog, rep: resolveQuoteRep(user.email) });
};

type DraftLine = {
  id: number | null;
  clientKey: string;
  name: string;
  quantity: number;
  description: string;
  priceInput: string;
  unitPriceCents: number;
  catalogItemId: number | null;
  catalogResolutionToken: string | null;
  imageId: number | null;
  imageUrl: string | null;
  imageThumbnail: string | null;
};

type DraftPayment = {
  id: number | null;
  clientKey: string;
  label: string;
  amountInput: string;
  amountCents: number;
  detail: string;
};

function descToString(raw: unknown) {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean).join("\n");
  return "";
}

function lineToDraft(line: {
  id: number;
  name: string;
  quantity: number;
  descriptionLines: unknown;
  unitPriceCents: number;
  catalogItemId: number | null;
  imageId: number | null;
  Image: { location: string; thumbnail: string | null } | null;
}): DraftLine {
  return {
    id: line.id,
    clientKey: String(line.id),
    name: line.name,
    quantity: line.quantity,
    description: descToString(line.descriptionLines),
    priceInput: centsToInput(line.unitPriceCents),
    unitPriceCents: line.unitPriceCents,
    catalogItemId: line.catalogItemId,
    catalogResolutionToken: null,
    imageId: line.imageId,
    imageUrl: line.Image?.location ?? null,
    imageThumbnail: line.Image?.thumbnail ?? null,
  };
}

function paymentToDraft(opt: {
  id: number;
  label: string;
  amountCents: number;
  detail: string | null;
}): DraftPayment {
  return {
    id: opt.id,
    clientKey: String(opt.id),
    label: opt.label,
    amountInput: centsToInput(opt.amountCents),
    amountCents: opt.amountCents,
    detail: opt.detail ?? "",
  };
}

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
    const idRaw = form.get(`line.${i}.id`);
    const lineId = idRaw ? Number(idRaw) : null;
    const catalogRaw = form.get(`line.${i}.catalogItemId`);
    const catalogItemId = catalogRaw ? Number(catalogRaw) : null;
    const tokenRaw = form.get(`line.${i}.catalogResolutionToken`);
    const catalogResolutionToken = tokenRaw ? String(tokenRaw) : null;
    const imageRaw = form.get(`line.${i}.imageId`);
    const imageId = imageRaw ? Number(imageRaw) : null;
    lines.push({
      ...(Number.isFinite(lineId as number) ? { id: lineId as number } : {}),
      name,
      quantity,
      descriptionLines,
      unitPriceCents,
      catalogItemId: Number.isFinite(catalogItemId as number) ? catalogItemId : null,
      catalogResolutionToken,
      imageId: Number.isFinite(imageId as number) ? imageId : null,
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
  const { user } = await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "Invalid id" }, { status: 400 });

  const form = await request.formData();
  const intent = String(form.get("intent") || "save");
  if (intent !== "save" && intent !== "save-print" && intent !== "autosave") {
    return json({ error: "Unknown intent" }, { status: 400 });
  }

  const revision = Number(form.get("revision") || 0);
  const issuedRaw = String(form.get("issuedAt") || "");
  const issuedAt = issuedRaw ? new Date(issuedRaw + "T12:00:00") : undefined;
  const result = await saveQuotation({
    quotationId: id,
    ownerUserId: user.id,
    revision: Number.isFinite(revision) ? revision : 0,
    intent: intent as "save" | "save-print" | "autosave",
    title: String(form.get("title") || ""),
    issuedAt,
    status: String(form.get("status") || "draft") === "final" ? "final" : "draft",
    location: String(form.get("location") || "") || null,
    document: String(form.get("document") || "") || null,
    notes: String(form.get("notes") || "") || null,
    lines: parseLinesFromForm(form),
    paymentOptions: parsePaymentsFromForm(form),
  });

  return json({ ...result, revision: Number.isFinite(revision) ? revision : 0 }, {
    status: result.ok ? 200 : result.status,
  });
};

export const shouldRevalidate = ({ actionResult, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) => {
  if (actionResult && typeof actionResult === "object" && "ok" in actionResult) {
    return false;
  }
  return defaultShouldRevalidate;
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function newClientKey() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const AUTOSAVE_EVERY_MS = 2 * 60 * 1000;

export default function QuotationBuilder() {
  const { quotation, catalog, rep } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const issuedValue = new Date(quotation.issuedAt).toISOString().slice(0, 10);
  const quotationId = quotation.id;

  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [isLg, setIsLg] = useState(false);
  const [title, setTitle] = useState(quotation.title);
  const [issuedAt, setIssuedAt] = useState(issuedValue);
  const [status, setStatus] = useState(quotation.status);
  const [location, setLocation] = useState(quotation.client.location ?? "");
  const [document, setDocument] = useState(quotation.client.document ?? "");
  const [notes, setNotes] = useState(quotation.notes ?? "");
  const [lines, setLines] = useState<DraftLine[]>(() => quotation.lines.map(lineToDraft));
  const [payments, setPayments] = useState<DraftPayment[]>(() =>
    quotation.paymentOptions.map(paymentToDraft),
  );
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
  const saveBusy = saveFetcher.state !== "idle";
  const busy = saveBusy || lineUploadingKey !== null;

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    ignoreDirtyUntilRef.current = 1;
    revisionStateRef.current = initialRevisionState();
    setAutosaveHint(null);
    setTitle(quotation.title);
    setIssuedAt(new Date(quotation.issuedAt).toISOString().slice(0, 10));
    setStatus(quotation.status);
    setLocation(quotation.client.location ?? "");
    setDocument(quotation.client.document ?? "");
    setNotes(quotation.notes ?? "");
    setLines(quotation.lines.map(lineToDraft));
    setPayments(quotation.paymentOptions.map(paymentToDraft));
    setActionError(null);
  }, [
    quotationId,
    quotation.client.document,
    quotation.client.location,
    quotation.issuedAt,
    quotation.lines,
    quotation.notes,
    quotation.paymentOptions,
    quotation.status,
    quotation.title,
  ]);

  useEffect(() => {
    if (ignoreDirtyUntilRef.current > 0) {
      ignoreDirtyUntilRef.current -= 1;
      return;
    }
    revisionStateRef.current = markRevisionEdited(revisionStateRef.current);
    setActionError(null);
    setAutosaveHint(null);
  }, [title, issuedAt, status, location, document, notes, lines, payments]);

  useEffect(() => {
    const data = saveFetcher.data as
      | { ok: true; quotationId: number; revision: number; redirectTo?: string }
      | { ok: false; status: number; error: string; revision: number }
      | undefined;
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
    setAutosaveHint(
      `Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    );
  }, [navigate, saveFetcher.data, saveFetcher.state]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (status !== "draft") return;
      const fetcher = saveFetcherRef.current;
      if (!revisionStateRef.current.dirty || !formRef.current) return;
      if (fetcher.state !== "idle" || lineUploadingKeyRef.current !== null) return;
      submitQuotation("autosave");
    }, AUTOSAVE_EVERY_MS);
    return () => window.clearInterval(id);
  }, [status]);

  function submitQuotation(intent: "save" | "save-print" | "autosave") {
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
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "save-print" ? "save-print" : "save";
    submitQuotation(intent);
  }

  const updateLine = useCallback((clientKey: string, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      updateEditorRow(prev, clientKey, (line) => {
        const next = { ...line, ...patch };
        if (patch.priceInput !== undefined) {
          next.unitPriceCents = parseBRLToCents(patch.priceInput) ?? line.unitPriceCents;
        }
        return next;
      }),
    );
  }, []);

  const updatePayment = useCallback((clientKey: string, patch: Partial<DraftPayment>) => {
    setPayments((prev) =>
      updateEditorRow(prev, clientKey, (payment) => {
        const next = { ...payment, ...patch };
        if (patch.amountInput !== undefined) {
          next.amountCents = parseBRLToCents(patch.amountInput) ?? payment.amountCents;
        }
        return next;
      }),
    );
  }, []);

  const addBlankLine = useCallback(() => {
    const clientKey = newClientKey();
    setLines((prev) => [
      ...prev,
      {
        id: null,
        clientKey,
        name: "Novo item",
        quantity: 1,
        description: "",
        priceInput: "0,00",
        unitPriceCents: 0,
        catalogItemId: null,
        catalogResolutionToken: null,
        imageId: null,
        imageUrl: null,
        imageThumbnail: null,
      },
    ]);
  }, []);

  const addCatalogDraft = useCallback((draft: CatalogPickerAddedDraft) => {
    const clientKey = newClientKey();
    setLines((current) => [
      ...current,
      {
        id: null,
        clientKey,
        name: draft.name,
        quantity: 1,
        description: draft.descriptionLines.join("\n"),
        priceInput: centsToInput(draft.unitPriceCents ?? 0),
        unitPriceCents: draft.unitPriceCents ?? 0,
        catalogItemId: draft.catalogItemId,
        catalogResolutionToken: draft.catalogResolutionToken,
        imageId: draft.imageId,
        imageUrl: draft.imageUrl,
        imageThumbnail: draft.imageThumbnail,
      },
    ]);
  }, []);

  const removeLine = useCallback((clientKey: string) => {
    setLines((prev) => prev.filter((line) => line.clientKey !== clientKey));
  }, []);

  const addPayment = useCallback(() => {
    const clientKey = newClientKey();
    setPayments((prev) => [
      ...prev,
      {
        id: null,
        clientKey,
        label: "À vista",
        amountInput: "0,00",
        amountCents: 0,
        detail: "",
      },
    ]);
  }, []);

  const removePayment = useCallback((clientKey: string) => {
    setPayments((prev) => prev.filter((payment) => payment.clientKey !== clientKey));
  }, []);

  const handleLineImageUpload = useCallback(async (clientKey: string, file: File) => {
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
      const res = await fetch("/admin/uploads", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const data = (await res.json()) as { id?: number; location?: string; thumbnail?: string; error?: string };
      if (!res.ok || data.error || data.id == null) {
        setLineUploadErrors((prev) => ({
          ...prev,
          [clientKey]: data.error ?? "Falha no envio da imagem",
        }));
        return;
      }

      updateLine(clientKey, {
        imageId: data.id,
        imageUrl: data.location ?? null,
        imageThumbnail: data.thumbnail ?? null,
      });
    } catch {
      setLineUploadErrors((prev) => ({
        ...prev,
        [clientKey]: "Falha no envio da imagem",
      }));
    } finally {
      setLineUploadingKey(null);
    }
  }, [updateLine]);

  const previewInput = useMemo(
    () => ({
      title,
      issuedAt,
      client: {
        name: quotation.client.name,
        location: location || null,
        document: document || null,
      },
      lines: lines.map((line) => ({
        clientKey: line.clientKey,
        name: line.name,
        quantity: line.quantity,
        descriptionLines: line.description
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean),
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
    [title, issuedAt, quotation.client.name, location, document, lines, payments, notes, rep],
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
            <h1 className="font-display text-xl font-bold">{quotation.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2 lg:hidden">
              <Button
                type="button"
                variant={pane === "edit" ? "default" : "outline"}
                size="sm"
                onClick={() => setPane("edit")}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant={pane === "preview" ? "default" : "outline"}
                size="sm"
                onClick={() => setPane("preview")}
              >
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
          className={cn(
            "no-print space-y-6 self-start border border-border bg-white p-4",
            pane !== "edit" && "hidden lg:block",
          )}
        >
          <input type="hidden" name="lineCount" value={lines.length} />
          <input type="hidden" name="paymentCount" value={payments.length} />

          {actionError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionError}
            </p>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Cabeçalho</h2>
            <div>
              <Label htmlFor="title">Título / Cliente</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="issuedAt">Data</Label>
                <Input
                  id="issuedAt"
                  name="issuedAt"
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                />
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
            <div>
              <Label htmlFor="location">Local (opcional)</Label>
              <Input
                id="location"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <TaxIdInput
              id="document"
              name="document"
              value={document}
              onValueChange={setDocument}
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Itens</h2>
              <Button type="button" variant="outline" size="sm" onClick={addBlankLine}>
                + Linha avulsa
              </Button>
            </div>
            <CatalogVariationPicker summaries={catalog} onAdd={addCatalogDraft} />
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
              <QuotationEditorPaymentRow
                key={opt.clientKey}
                payment={opt}
                index={i}
                onRemove={removePayment}
                onChange={updatePayment}
              />
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

        <div
          className={cn(
            "space-y-3 self-start lg:sticky lg:top-4 print:static",
            pane !== "preview" && "hidden lg:block print:block",
          )}
        >
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
