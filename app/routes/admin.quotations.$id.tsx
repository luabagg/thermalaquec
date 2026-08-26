import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuotationDocument } from "~/components/admin/QuotationDocument";
import { Button } from "~/components/ui/button";
import { FileButton } from "~/components/ui/file-button";
import { TaxIdInput } from "~/components/ui/tax-id-input";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME, resolveQuoteRep } from "~/lib/site";
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
  const { user } = await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw redirect("/admin/quotations");
  const quotation = await getQuotation(id, user.id);
  if (!quotation) throw new Response("Not found", { status: 404 });
  const catalog = await listCatalogItems();
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
  imageId: number | null;
  imageUrl: string | null;
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
  Image: { location: string } | null;
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
    imageId: line.imageId,
    imageUrl: line.Image?.location ?? null,
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
    const catalogRaw = form.get(`line.${i}.catalogItemId`);
    const catalogItemId = catalogRaw ? Number(catalogRaw) : null;
    const imageRaw = form.get(`line.${i}.imageId`);
    const imageId = imageRaw ? Number(imageRaw) : null;
    lines.push({
      name,
      quantity,
      descriptionLines,
      unitPriceCents,
      catalogItemId: Number.isFinite(catalogItemId as number) ? catalogItemId : null,
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
  const ownerUserId = user.id;

  const form = await request.formData();
  const intent = String(form.get("intent") || "save");
  if (intent !== "save" && intent !== "save-print" && intent !== "autosave") {
    return json({ error: "Unknown intent" }, { status: 400 });
  }

  const issuedRaw = String(form.get("issuedAt") || "");
  const issuedAt = issuedRaw ? new Date(issuedRaw + "T12:00:00") : undefined;

  const updated = await updateQuotationMeta(id, ownerUserId, {
    title: String(form.get("title") || ""),
    notes: String(form.get("notes") || "") || null,
    status: String(form.get("status") || "draft") === "final" ? "final" : "draft",
    issuedAt,
    clientLocation: String(form.get("location") || "") || null,
    clientDocument: String(form.get("document") || "") || null,
  });
  if (!updated) return json({ error: "Not found" }, { status: 404 });

  if (!(await replaceQuotationLines(id, ownerUserId, parseLinesFromForm(form)))) {
    return json({ error: "Not found" }, { status: 404 });
  }
  if (!(await replacePaymentOptions(id, ownerUserId, parsePaymentsFromForm(form)))) {
    return json({ error: "Not found" }, { status: 404 });
  }

  if (intent === "autosave") {
    return json({ ok: true });
  }

  if (intent === "save-print") {
    return redirect(`/admin/quotations/${id}/print?autoprint=1`);
  }

  return redirect(`/admin/quotations/${id}?saved=1`);
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function newClientKey() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const AUTOSAVE_EVERY_MS = 2 * 60 * 1000;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function QuotationBuilder() {
  const { quotation, catalog, rep } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const busy = navigation.state !== "idle";
  const issuedValue = new Date(quotation.issuedAt).toISOString().slice(0, 10);
  const quotationId = quotation.id;

  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [isLg, setIsLg] = useState<boolean | null>(null);
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
  const [catalogSelection, setCatalogSelection] = useState("");
  const [lineUploadErrors, setLineUploadErrors] = useState<Record<string, string>>({});
  const [lineUploadingKey, setLineUploadingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [autosaveHint, setAutosaveHint] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveFetcher = useFetcher<typeof action>();
  const autosaveFetcherRef = useRef(autosaveFetcher);
  const dirtyRef = useRef(false);
  const ignoreDirtyUntilRef = useRef(1);
  autosaveFetcherRef.current = autosaveFetcher;

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    ignoreDirtyUntilRef.current = 2;
    dirtyRef.current = false;
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
  }, [quotationId]);

  useEffect(() => {
    if (searchParams.get("saved") !== "1") return;
    ignoreDirtyUntilRef.current = 2;
    dirtyRef.current = false;
    setTitle(quotation.title);
    setIssuedAt(new Date(quotation.issuedAt).toISOString().slice(0, 10));
    setStatus(quotation.status);
    setLocation(quotation.client.location ?? "");
    setDocument(quotation.client.document ?? "");
    setNotes(quotation.notes ?? "");
    setLines(quotation.lines.map(lineToDraft));
    setPayments(quotation.paymentOptions.map(paymentToDraft));
    setActionError(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("saved");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, quotation, setSearchParams]);

  useEffect(() => {
    if (ignoreDirtyUntilRef.current > 0) {
      ignoreDirtyUntilRef.current -= 1;
      return;
    }
    dirtyRef.current = true;
  }, [title, issuedAt, status, location, document, notes, lines, payments]);

  useEffect(() => {
    const data = autosaveFetcher.data;
    if (autosaveFetcher.state !== "idle" || !data || !("ok" in data) || !data.ok) return;
    dirtyRef.current = false;
    setAutosaveHint(
      `Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    );
  }, [autosaveFetcher.state, autosaveFetcher.data]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (status !== "draft") return;
      const fetcher = autosaveFetcherRef.current;
      if (!dirtyRef.current || !formRef.current) return;
      if (fetcher.state !== "idle") return;
      const body = new FormData(formRef.current);
      body.set("intent", "autosave");
      fetcher.submit(body, { method: "post" });
    }, AUTOSAVE_EVERY_MS);
    return () => window.clearInterval(id);
  }, [status]);

  function updateLine(clientKey: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.clientKey !== clientKey) return line;
        const next = { ...line, ...patch };
        if (patch.priceInput !== undefined) {
          next.unitPriceCents = parseBRLToCents(patch.priceInput) ?? line.unitPriceCents;
        }
        return next;
      }),
    );
  }

  function updatePayment(clientKey: string, patch: Partial<DraftPayment>) {
    setPayments((prev) =>
      prev.map((payment) => {
        if (payment.clientKey !== clientKey) return payment;
        const next = { ...payment, ...patch };
        if (patch.amountInput !== undefined) {
          next.amountCents = parseBRLToCents(patch.amountInput) ?? payment.amountCents;
        }
        return next;
      }),
    );
  }

  function addBlankLine() {
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
        imageId: null,
        imageUrl: null,
      },
    ]);
  }

  function addFromCatalog() {
    if (!catalogSelection) return;
    const item = catalog.find((c) => String(c.id) === catalogSelection);
    if (!item) return;
    const clientKey = newClientKey();
    const desc = Array.isArray(item.descriptionLines)
      ? (item.descriptionLines as string[]).join("\n")
      : "";
    setLines((prev) => [
      ...prev,
      {
        id: null,
        clientKey,
        name: item.name,
        quantity: 1,
        description: desc,
        priceInput: centsToInput(item.defaultUnitPriceCents ?? 0),
        unitPriceCents: item.defaultUnitPriceCents ?? 0,
        catalogItemId: item.id,
        imageId: item.imageId ?? null,
        imageUrl: item.Image?.location ?? null,
      },
    ]);
    setCatalogSelection("");
  }

  function removeLine(clientKey: string) {
    setLines((prev) => prev.filter((line) => line.clientKey !== clientKey));
  }

  function addPayment() {
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
  }

  function removePayment(clientKey: string) {
    setPayments((prev) => prev.filter((payment) => payment.clientKey !== clientKey));
  }

  async function handleLineImageUpload(clientKey: string, file: File) {
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
      const data = (await res.json()) as { id?: number; location?: string; error?: string };
      if (!res.ok || data.error || data.id == null) {
        setLineUploadErrors((prev) => ({
          ...prev,
          [clientKey]: data.error ?? "Falha no envio da imagem",
        }));
        return;
      }

      updateLine(clientKey, { imageId: data.id, imageUrl: data.location ?? null });
    } catch {
      setLineUploadErrors((prev) => ({
        ...prev,
        [clientKey]: "Falha no envio da imagem",
      }));
    } finally {
      setLineUploadingKey(null);
    }
  }

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
        name: line.name,
        quantity: line.quantity,
        descriptionLines: line.description
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean),
        unitPriceCents: line.unitPriceCents,
        imageUrl: line.imageUrl,
      })),
      paymentOptions: payments.map((payment) => ({
        label: payment.label,
        amountCents: payment.amountCents,
        detail: payment.detail || null,
      })),
      notes: notes || null,
      rep,
    }),
    [title, issuedAt, quotation.client.name, location, document, lines, payments, notes, rep],
  );
  const preview = useDebouncedValue(previewInput, 120);
  const showPreview = isLg === null || isLg || pane === "preview";

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
            <div className="flex gap-2">
              <select
                value={catalogSelection}
                onChange={(e) => setCatalogSelection(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
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
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                disabled={catalog.length === 0 || !catalogSelection}
                onClick={addFromCatalog}
              >
                Adicionar
              </Button>
            </div>
            {lines.map((line, i) => (
              <div key={line.clientKey} className="space-y-2 border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">#{i + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => removeLine(line.clientKey)}
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remover</span>
                  </Button>
                </div>
                <input type="hidden" name={`line.${i}.catalogItemId`} value={line.catalogItemId ?? ""} />
                <input type="hidden" name={`line.${i}.imageId`} value={line.imageId ?? ""} />
                <Input
                  name={`line.${i}.name`}
                  value={line.name}
                  onChange={(e) => updateLine(line.clientKey, { name: e.target.value })}
                  placeholder="Item"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    name={`line.${i}.quantity`}
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.clientKey, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    placeholder="Qtd"
                  />
                  <Input
                    name={`line.${i}.price`}
                    value={line.priceInput}
                    onChange={(e) => updateLine(line.clientKey, { priceInput: e.target.value })}
                    placeholder="Preço unit."
                  />
                </div>
                <textarea
                  name={`line.${i}.description`}
                  rows={3}
                  value={line.description}
                  onChange={(e) => updateLine(line.clientKey, { description: e.target.value })}
                  placeholder="Descrição (uma linha por bullet)"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                {line.imageUrl ? (
                  <img
                    src={line.imageUrl}
                    alt=""
                    className="h-16 w-16 rounded border border-border object-cover"
                  />
                ) : null}
                <div>
                  <Label htmlFor={`line-img-${line.clientKey}`}>Imagem do item</Label>
                  <FileButton
                    id={`line-img-${line.clientKey}`}
                    className="mt-1"
                    disabled={lineUploadingKey === line.clientKey}
                    busy={lineUploadingKey === line.clientKey}
                    onFile={(file) => void handleLineImageUpload(line.clientKey, file)}
                  />
                  {lineUploadErrors[line.clientKey] ? (
                    <p className="mt-1 text-sm text-destructive">
                      {lineUploadErrors[line.clientKey]}
                    </p>
                  ) : null}
                </div>
                {line.quantity * line.unitPriceCents > 0 ? (
                  <p className="text-right text-sm text-heat">
                    Valor: {formatBRL(line.quantity * line.unitPriceCents)}
                  </p>
                ) : null}
              </div>
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
              <div key={opt.clientKey} className="space-y-2 border border-border p-3">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => removePayment(opt.clientKey)}
                    aria-label="Remover pagamento"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remover</span>
                  </Button>
                </div>
                <Input
                  name={`pay.${i}.label`}
                  value={opt.label}
                  onChange={(e) => updatePayment(opt.clientKey, { label: e.target.value })}
                  placeholder="Rótulo"
                />
                <Input
                  name={`pay.${i}.amount`}
                  value={opt.amountInput}
                  onChange={(e) => updatePayment(opt.clientKey, { amountInput: e.target.value })}
                  placeholder="Valor total da opção"
                />
                <Input
                  name={`pay.${i}.detail`}
                  value={opt.detail}
                  onChange={(e) => updatePayment(opt.clientKey, { detail: e.target.value })}
                  placeholder="Detalhe (opcional)"
                />
              </div>
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
                <QuotationDocument
                  title={preview.title}
                  issuedAt={preview.issuedAt}
                  client={preview.client}
                  lines={preview.lines}
                  paymentOptions={preview.paymentOptions}
                  notes={preview.notes}
                  rep={preview.rep}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
