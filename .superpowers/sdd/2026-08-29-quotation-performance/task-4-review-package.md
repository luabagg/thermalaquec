git log --oneline f70865cadbd66e7c07e020fcd5261590a505c1fb..HEAD
055910f perf: memoize quotation editor preview

git diff --stat f70865cadbd66e7c07e020fcd5261590a505c1fb..HEAD
 .../task-4-report.md                               |   36 +
 .../task-4-review-package.md                       | 1036 ++++++++++++++++++++
 app/components/admin/QuotationDocument.tsx         |   17 +-
 app/components/admin/QuotationEditorRows.tsx       |  176 ++++
 app/components/admin/QuotationPreview.tsx          |   47 +
 app/components/admin/quotation-editor.test.tsx     |   36 +
 app/models/quotation.server.ts                     |    4 +-
 app/routes/admin.quotations.$id.tsx                |  227 ++---
 app/routes/admin.quotations.$id_.print.tsx         |    7 +-
 9 files changed, 1416 insertions(+), 170 deletions(-)

git diff -U10 f70865cadbd66e7c07e020fcd5261590a505c1fb..HEAD
diff --git a/.superpowers/sdd/2026-08-29-quotation-performance/task-4-report.md b/.superpowers/sdd/2026-08-29-quotation-performance/task-4-report.md
new file mode 100644
index 0000000..f7a0fe7
--- /dev/null
+++ b/.superpowers/sdd/2026-08-29-quotation-performance/task-4-report.md
@@ -0,0 +1,36 @@
+# Task 4 Report
+
+## Changed files
+- `app/routes/admin.quotations.$id.tsx`
+- `app/routes/admin.quotations.$id_.print.tsx`
+- `app/components/admin/QuotationDocument.tsx`
+- `app/components/admin/QuotationEditorRows.tsx`
+- `app/components/admin/QuotationPreview.tsx`
+- `app/components/admin/quotation-editor.test.tsx`
+- `app/models/quotation.server.ts`
+
+## What changed
+- Extracted memoized editor row components for quotation lines/payments.
+- Switched editor callbacks to `useCallback` and removed the fixed preview debounce.
+- Added deferred preview rendering via `useDeferredValue`.
+- Changed preview/document keys to stable `clientKey`-based keys.
+- Added `thumbnail ?? location` fallback in editor/preview/print image rendering.
+- Updated print route data mapping to pass stable keys and thumbnail fields.
+- Widened quotation relation typing to tolerate optional thumbnail data.
+
+## Tests / commands
+- `npm test -- 'app/routes/admin.quotations.$id.test.tsx' 'app/components/admin/quotation-editor.test.tsx'`
+  - Passed: 2 files, 5 tests.
+- `npm run typecheck`
+  - Passed.
+- `npx eslint app/components/admin/QuotationDocument.tsx app/components/admin/QuotationEditorRows.tsx app/components/admin/QuotationPreview.tsx app/components/admin/quotation-editor.test.tsx app/models/quotation.server.ts 'app/routes/admin.quotations.$id.tsx' 'app/routes/admin.quotations.$id_.print.tsx'`
+  - Passed.
+
+## Self-review
+- The preview path now defers work instead of using a timer-based debounce.
+- Editor rows are isolated and memoized; stable row keys avoid remounts from array indices.
+- Image rendering now prefers thumbnails where present and falls back to location.
+
+## Residual concerns
+- The preview deferment is implemented client-side; runtime behavior under extreme load still depends on React scheduling.
+- Thumbnail data is wired defensively, but the persisted thumbnail field itself is still pending the later image task.
diff --git a/.superpowers/sdd/2026-08-29-quotation-performance/task-4-review-package.md b/.superpowers/sdd/2026-08-29-quotation-performance/task-4-review-package.md
new file mode 100644
index 0000000..c92e094
--- /dev/null
+++ b/.superpowers/sdd/2026-08-29-quotation-performance/task-4-review-package.md
@@ -0,0 +1,1036 @@
+git log --oneline f70865cadbd66e7c07e020fcd5261590a505c1fb..HEAD
+d8dd1a2 perf: memoize quotation editor preview
+
+git diff --stat f70865cadbd66e7c07e020fcd5261590a505c1fb..HEAD
+ app/components/admin/QuotationDocument.tsx     |  17 +-
+ app/components/admin/QuotationEditorRows.tsx   | 176 +++++++++++++++++++
+ app/components/admin/QuotationPreview.tsx      |  47 +++++
+ app/components/admin/quotation-editor.test.tsx |  36 ++++
+ app/models/quotation.server.ts                 |   4 +-
+ app/routes/admin.quotations.$id.tsx            | 227 ++++++++-----------------
+ app/routes/admin.quotations.$id_.print.tsx     |   7 +-
+ 7 files changed, 344 insertions(+), 170 deletions(-)
+
+git diff -U10 f70865cadbd66e7c07e020fcd5261590a505c1fb..HEAD
+diff --git a/app/components/admin/QuotationDocument.tsx b/app/components/admin/QuotationDocument.tsx
+index 06ef248..d4f7b36 100644
+--- a/app/components/admin/QuotationDocument.tsx
++++ b/app/components/admin/QuotationDocument.tsx
+@@ -4,24 +4,26 @@ import type { QuotationLine, QuotationPaymentOption, QuoteClient } from "@prisma
+ import { formatBRL, quotationTotalCents, splitNoteLines } from "~/utils/quotation";
+ import { formatTaxId, taxIdLabel } from "~/utils/tax-id";
+ import { QUOTE_COMPANY, type QuoteRepProfile } from "~/lib/site";
+ 
+ type QuotationDocumentProps = {
+   title: string;
+   issuedAt: Date | string;
+   client: Pick<QuoteClient, "name" | "location" | "document">;
+   lines: Array<
+     Pick<QuotationLine, "name" | "quantity" | "descriptionLines" | "unitPriceCents"> & {
++      clientKey?: string;
+       imageUrl?: string | null;
++      thumbnailUrl?: string | null;
+     }
+   >;
+-  paymentOptions: Array<Pick<QuotationPaymentOption, "label" | "amountCents" | "detail">>;
++  paymentOptions: Array<Pick<QuotationPaymentOption, "label" | "amountCents" | "detail"> & { clientKey?: string }>;
+   notes: string | null;
+   rep: QuoteRepProfile;
+   /** Dedicated print page: no screen chrome, print stylesheet applies. */
+   printMode?: boolean;
+ };
+ 
+ function asDate(value: Date | string) {
+   return value instanceof Date ? value : new Date(value);
+ }
+ 
+@@ -102,46 +104,45 @@ export const QuotationDocument = memo(function QuotationDocument({
+       <div className="quote-doc__table-head" role="row">
+         <span>Item</span>
+         <span>Qtd.</span>
+         <span>Descrição</span>
+       </div>
+ 
+       <ol className="quote-doc__lines">
+         {lines.map((line, index) => {
+           const bullets = descLines(line.descriptionLines);
+           const lineTotal = line.quantity * line.unitPriceCents;
+-          const hasPhoto = Boolean(line.imageUrl);
++          const imageSrc = line.thumbnailUrl ?? line.imageUrl;
++          const hasPhoto = Boolean(imageSrc);
+           return (
+-            <li key={`${line.name}-${index}`} className="quote-doc__line">
++            <li key={line.clientKey ?? `${line.name}-${line.quantity}-${line.unitPriceCents}`} className="quote-doc__line">
+               <div className="quote-doc__line-main">
+                 <span className="quote-doc__line-num">{index + 1}</span>
+                 <div
+                   className={
+                     hasPhoto
+                       ? "quote-doc__line-body"
+                       : "quote-doc__line-body quote-doc__line-body--no-photo"
+                   }
+                 >
+                   <p className="quote-doc__line-name">{line.name}</p>
+                   <span className="quote-doc__line-qty">{line.quantity}</span>
+                   {bullets.length > 0 ? (
+                     <ul className="quote-doc__line-desc">
+                       {bullets.map((b) => (
+                         <li key={b}>{b}</li>
+                       ))}
+                     </ul>
+                   ) : (
+                     <span className="quote-doc__line-desc-empty" />
+                   )}
+-                  {hasPhoto ? (
+-                    <img className="quote-doc__line-photo" src={line.imageUrl ?? ""} alt="" />
+-                  ) : null}
++                  {hasPhoto ? <img className="quote-doc__line-photo" src={imageSrc ?? ""} alt="" /> : null}
+                 </div>
+               </div>
+               {lineTotal > 0 ? (
+                 <p className="quote-doc__line-price">
+                   Valor: <strong>{formatBRL(lineTotal)}</strong>
+                 </p>
+               ) : null}
+             </li>
+           );
+         })}
+@@ -158,22 +159,22 @@ export const QuotationDocument = memo(function QuotationDocument({
+               <li key={item}>{item}</li>
+             ))}
+           </ul>
+         ) : null}
+       </section>
+ 
+       {paymentOptions.length > 0 ? (
+         <section className="quote-doc__payments">
+           <h2>formas de pagamento</h2>
+           <ul>
+-            {paymentOptions.map((opt, i) => (
+-              <li key={`${opt.label}-${i}`}>
++            {paymentOptions.map((opt) => (
++              <li key={opt.clientKey ?? `${opt.label}-${opt.amountCents}`}>
+                 <span className="quote-doc__pay-label">{opt.label}</span>
+                 <span className="quote-doc__pay-amount">{formatBRL(opt.amountCents)}</span>
+                 {opt.detail ? <span className="quote-doc__pay-detail">{opt.detail}</span> : null}
+               </li>
+             ))}
+           </ul>
+         </section>
+       ) : null}
+       </article>
+ 
+diff --git a/app/components/admin/QuotationEditorRows.tsx b/app/components/admin/QuotationEditorRows.tsx
+new file mode 100644
+index 0000000..c9b414c
+--- /dev/null
++++ b/app/components/admin/QuotationEditorRows.tsx
+@@ -0,0 +1,176 @@
++import { memo } from "react";
++import { Trash2 } from "lucide-react";
++
++import { Button } from "~/components/ui/button";
++import { FileButton } from "~/components/ui/file-button";
++import { Input } from "~/components/ui/input";
++import { Label } from "~/components/ui/label";
++import { formatBRL } from "~/utils/quotation";
++
++export type QuotationEditorLine = {
++  id: number | null;
++  clientKey: string;
++  name: string;
++  quantity: number;
++  description: string;
++  priceInput: string;
++  unitPriceCents: number;
++  catalogItemId: number | null;
++  imageId: number | null;
++  imageUrl: string | null;
++  imageThumbnail: string | null;
++};
++
++export type QuotationEditorPayment = {
++  id: number | null;
++  clientKey: string;
++  label: string;
++  amountInput: string;
++  amountCents: number;
++  detail: string;
++};
++
++type QuotationEditorLineRowProps = {
++  line: QuotationEditorLine;
++  index: number;
++  busy: boolean;
++  lineUploading: boolean;
++  uploadError?: string;
++  onRemove(clientKey: string): void;
++  onChange(clientKey: string, patch: Partial<QuotationEditorLine>): void;
++  onUpload(clientKey: string, file: File): void;
++};
++
++export const QuotationEditorLineRow = memo(function QuotationEditorLineRow({
++  line,
++  index,
++  busy,
++  lineUploading,
++  uploadError,
++  onRemove,
++  onChange,
++  onUpload,
++}: QuotationEditorLineRowProps) {
++  const imageSrc = line.imageThumbnail ?? line.imageUrl;
++
++  return (
++    <div className="space-y-2 border border-border p-3">
++      <div className="flex items-center justify-between gap-2">
++        <p className="text-xs text-muted-foreground">#{index + 1}</p>
++        <Button
++          type="button"
++          variant="ghost"
++          size="sm"
++          className="h-8 text-destructive hover:text-destructive"
++          onClick={() => onRemove(line.clientKey)}
++          aria-label="Remover item"
++        >
++          <Trash2 className="h-4 w-4" />
++          <span className="sr-only">Remover</span>
++        </Button>
++      </div>
++      <input type="hidden" name={`line.${index}.catalogItemId`} value={line.catalogItemId ?? ""} />
++      <input type="hidden" name={`line.${index}.imageId`} value={line.imageId ?? ""} />
++      <Input
++        name={`line.${index}.name`}
++        value={line.name}
++        onChange={(e) => onChange(line.clientKey, { name: e.target.value })}
++        placeholder="Item"
++        required
++      />
++      <div className="grid grid-cols-2 gap-2">
++        <Input
++          name={`line.${index}.quantity`}
++          type="number"
++          min={1}
++          value={line.quantity}
++          onChange={(e) =>
++            onChange(line.clientKey, {
++              quantity: Math.max(1, Number(e.target.value) || 1),
++            })
++          }
++          placeholder="Qtd"
++        />
++        <Input
++          name={`line.${index}.price`}
++          value={line.priceInput}
++          onChange={(e) => onChange(line.clientKey, { priceInput: e.target.value })}
++          placeholder="Preço unit."
++        />
++      </div>
++      <textarea
++        name={`line.${index}.description`}
++        rows={3}
++        value={line.description}
++        onChange={(e) => onChange(line.clientKey, { description: e.target.value })}
++        placeholder="Descrição (uma linha por bullet)"
++        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
++      />
++      {imageSrc ? <img src={imageSrc} alt="" className="h-16 w-16 rounded border border-border object-cover" /> : null}
++      <div>
++        <Label htmlFor={`line-img-${line.clientKey}`}>Imagem do item</Label>
++        <FileButton
++          id={`line-img-${line.clientKey}`}
++          className="mt-1"
++          disabled={busy || lineUploading}
++          busy={busy || lineUploading}
++          onFile={(file) => onUpload(line.clientKey, file)}
++        />
++        {uploadError ? <p className="mt-1 text-sm text-destructive">{uploadError}</p> : null}
++      </div>
++      {line.quantity * line.unitPriceCents > 0 ? (
++        <p className="text-right text-sm text-heat">Valor: {formatBRL(line.quantity * line.unitPriceCents)}</p>
++      ) : null}
++    </div>
++  );
++});
++
++type QuotationEditorPaymentRowProps = {
++  payment: QuotationEditorPayment;
++  index: number;
++  onRemove(clientKey: string): void;
++  onChange(clientKey: string, patch: Partial<QuotationEditorPayment>): void;
++};
++
++export const QuotationEditorPaymentRow = memo(function QuotationEditorPaymentRow({
++  payment,
++  index,
++  onRemove,
++  onChange,
++}: QuotationEditorPaymentRowProps) {
++  return (
++    <div className="space-y-2 border border-border p-3">
++      <div className="flex justify-end">
++        <Button
++          type="button"
++          variant="ghost"
++          size="sm"
++          className="h-8 text-destructive hover:text-destructive"
++          onClick={() => onRemove(payment.clientKey)}
++          aria-label="Remover pagamento"
++        >
++          <Trash2 className="h-4 w-4" />
++          <span className="sr-only">Remover</span>
++        </Button>
++      </div>
++      <Input
++        name={`pay.${index}.label`}
++        value={payment.label}
++        onChange={(e) => onChange(payment.clientKey, { label: e.target.value })}
++        placeholder="Rótulo"
++      />
++      <Input
++        name={`pay.${index}.amount`}
++        value={payment.amountInput}
++        onChange={(e) => onChange(payment.clientKey, { amountInput: e.target.value })}
++        placeholder="Valor total da opção"
++      />
++      <Input
++        name={`pay.${index}.detail`}
++        value={payment.detail}
++        onChange={(e) => onChange(payment.clientKey, { detail: e.target.value })}
++        placeholder="Detalhe (opcional)"
++      />
++    </div>
++  );
++});
+diff --git a/app/components/admin/QuotationPreview.tsx b/app/components/admin/QuotationPreview.tsx
+new file mode 100644
+index 0000000..1a88540
+--- /dev/null
++++ b/app/components/admin/QuotationPreview.tsx
+@@ -0,0 +1,47 @@
++import { memo, useDeferredValue } from "react";
++
++import { QuotationDocument } from "~/components/admin/QuotationDocument";
++import type { QuoteRepProfile } from "~/lib/site";
++
++export type QuotationPreviewProps = {
++  title: string;
++  issuedAt: string;
++  client: {
++    name: string;
++    location: string | null;
++    document: string | null;
++  };
++  lines: Array<{
++    clientKey: string;
++    name: string;
++    quantity: number;
++    descriptionLines: string[];
++    unitPriceCents: number;
++    imageUrl?: string | null;
++    thumbnailUrl?: string | null;
++  }>;
++  paymentOptions: Array<{
++    clientKey: string;
++    label: string;
++    amountCents: number;
++    detail: string | null;
++  }>;
++  notes: string | null;
++  rep: QuoteRepProfile;
++};
++
++export const QuotationPreview = memo(function QuotationPreview(props: QuotationPreviewProps) {
++  const preview = useDeferredValue(props);
++
++  return (
++    <QuotationDocument
++      title={preview.title}
++      issuedAt={preview.issuedAt}
++      client={preview.client}
++      lines={preview.lines}
++      paymentOptions={preview.paymentOptions}
++      notes={preview.notes}
++      rep={preview.rep}
++    />
++  );
++});
+diff --git a/app/components/admin/quotation-editor.test.tsx b/app/components/admin/quotation-editor.test.tsx
+new file mode 100644
+index 0000000..591e95b
+--- /dev/null
++++ b/app/components/admin/quotation-editor.test.tsx
+@@ -0,0 +1,36 @@
++import { readFileSync } from "node:fs";
++import { resolve } from "node:path";
++
++import { expect, test } from "vitest";
++
++const root = resolve(process.cwd());
++const read = (path: string) => readFileSync(resolve(root, path), "utf8");
++
++test("quotation editor rows are memoized", () => {
++  const rows = read("app/components/admin/QuotationEditorRows.tsx");
++  expect(rows).toContain("export const QuotationEditorLineRow = memo");
++  expect(rows).toContain("export const QuotationEditorPaymentRow = memo");
++});
++
++test("quotation preview is deferred and editor route avoids time-based debounce", () => {
++  const preview = read("app/components/admin/QuotationPreview.tsx");
++  expect(preview).toContain("useDeferredValue");
++
++  const route = read("app/routes/admin.quotations.$id.tsx");
++  expect(route).not.toContain("useDebouncedValue");
++  expect(route).not.toContain("120");
++  expect(route).toContain("QuotationPreview");
++  expect(route).toContain("useCallback");
++});
++
++test("document and print keys use stable row keys and thumbnail fallback", () => {
++  const doc = read("app/components/admin/QuotationDocument.tsx");
++  expect(doc).toContain("clientKey ?? `${line.name}-${line.quantity}-${line.unitPriceCents}`");
++  expect(doc).toContain("thumbnailUrl ?? line.imageUrl");
++  expect(doc).toContain("clientKey ?? `${opt.label}-${opt.amountCents}`");
++
++  const printRoute = read("app/routes/admin.quotations.$id_.print.tsx");
++  expect(printRoute).toContain("clientKey: String(line.id)");
++  expect(printRoute).toContain("thumbnailUrl: line.Image?.thumbnail ?? null");
++  expect(printRoute).toContain("clientKey: String(option.id)");
++});
+diff --git a/app/models/quotation.server.ts b/app/models/quotation.server.ts
+index b8adb33..a01b994 100644
+--- a/app/models/quotation.server.ts
++++ b/app/models/quotation.server.ts
+@@ -1,18 +1,18 @@
+ import type { Prisma, QuoteCatalogItem, QuoteClient, Quotation, QuotationLine, QuotationPaymentOption } from "@prisma/client";
+ 
+ import prisma from "~/libs/prisma/client.server";
+ 
+ export type QuotationWithRelations = Quotation & {
+   client: QuoteClient;
+-  lines: (QuotationLine & { Image: { id: number; location: string } | null })[];
+-  paymentOptions: QuotationPaymentOption[];
++  lines: (QuotationLine & { Image: { id: number; location: string; thumbnail?: string | null } | null })[];
++  paymentOptions: (QuotationPaymentOption & { clientKey?: string })[];
+ };
+ 
+ export async function listQuoteClients() {
+   return prisma.quoteClient.findMany({ orderBy: { name: "asc" } });
+ }
+ 
+ export async function getQuoteClient(id: number) {
+   return prisma.quoteClient.findUnique({ where: { id } });
+ }
+ 
+diff --git a/app/routes/admin.quotations.$id.tsx b/app/routes/admin.quotations.$id.tsx
+index 43efeb9..4831f95 100644
+--- a/app/routes/admin.quotations.$id.tsx
++++ b/app/routes/admin.quotations.$id.tsx
+@@ -1,26 +1,25 @@
+ import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
+ import { json, redirect } from "@remix-run/node";
+ import { Form, Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
+-import { Trash2 } from "lucide-react";
+-import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
+-import { QuotationDocument } from "~/components/admin/QuotationDocument";
++import { useEffect, useMemo, useRef, useState, type FormEvent, useCallback } from "react";
++import { QuotationEditorLineRow, QuotationEditorPaymentRow } from "~/components/admin/QuotationEditorRows";
++import { QuotationPreview } from "~/components/admin/QuotationPreview";
+ import { Button } from "~/components/ui/button";
+-import { FileButton } from "~/components/ui/file-button";
+ import { TaxIdInput } from "~/components/ui/tax-id-input";
+ import { Input } from "~/components/ui/input";
+ import { Label } from "~/components/ui/label";
+ import { cn } from "~/lib/utils";
+ import { buildNoIndexMeta } from "~/lib/seo";
+ import { SITE_NAME, resolveQuoteRep } from "~/lib/site";
+ import { saveQuotation, getQuotation, listCatalogItems } from "~/models/quotation.server";
+-import { formatBRL, parseBRLToCents } from "~/utils/quotation";
++import { parseBRLToCents } from "~/utils/quotation";
+ import quotationStyles from "~/styles/quotation-document.css?url";
+ import { requireAdmin } from "~/utils/require-admin.server";
+ import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
+ 
+ export const links: LinksFunction = () => [{ rel: "stylesheet", href: quotationStyles }];
+ 
+ export const meta: MetaFunction<typeof loader> = ({ data }) =>
+   buildNoIndexMeta(`${data?.quotation.title ?? "Orçamento"} | ${SITE_NAME}`);
+ 
+ export const loader = async ({ request, params }: LoaderFunctionArgs) => {
+@@ -37,20 +36,21 @@ type DraftLine = {
+   id: number | null;
+   clientKey: string;
+   name: string;
+   quantity: number;
+   description: string;
+   priceInput: string;
+   unitPriceCents: number;
+   catalogItemId: number | null;
+   imageId: number | null;
+   imageUrl: string | null;
++  imageThumbnail: string | null;
+ };
+ 
+ type DraftPayment = {
+   id: number | null;
+   clientKey: string;
+   label: string;
+   amountInput: string;
+   amountCents: number;
+   detail: string;
+ };
+@@ -61,33 +61,34 @@ function descToString(raw: unknown) {
+ }
+ 
+ function lineToDraft(line: {
+   id: number;
+   name: string;
+   quantity: number;
+   descriptionLines: unknown;
+   unitPriceCents: number;
+   catalogItemId: number | null;
+   imageId: number | null;
+-  Image: { location: string } | null;
++  Image: { location: string; thumbnail?: string | null } | null;
+ }): DraftLine {
+   return {
+     id: line.id,
+     clientKey: String(line.id),
+     name: line.name,
+     quantity: line.quantity,
+     description: descToString(line.descriptionLines),
+     priceInput: centsToInput(line.unitPriceCents),
+     unitPriceCents: line.unitPriceCents,
+     catalogItemId: line.catalogItemId,
+     imageId: line.imageId,
+     imageUrl: line.Image?.location ?? null,
++    imageThumbnail: line.Image?.thumbnail ?? null,
+   };
+ }
+ 
+ function paymentToDraft(opt: {
+   id: number;
+   label: string;
+   amountCents: number;
+   detail: string | null;
+ }): DraftPayment {
+   return {
+@@ -187,37 +188,30 @@ export const shouldRevalidate = ({ actionResult, defaultShouldRevalidate }: Shou
+ function centsToInput(cents: number) {
+   return (cents / 100).toFixed(2).replace(".", ",");
+ }
+ 
+ function newClientKey() {
+   return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
+ }
+ 
+ const AUTOSAVE_EVERY_MS = 2 * 60 * 1000;
+ 
+-function useDebouncedValue<T>(value: T, delayMs: number) {
+-  const [debounced, setDebounced] = useState(value);
+-  useEffect(() => {
+-    const timer = window.setTimeout(() => setDebounced(value), delayMs);
+-    return () => window.clearTimeout(timer);
+-  }, [value, delayMs]);
+-  return debounced;
+-}
+-
+ export default function QuotationBuilder() {
+   const { quotation, catalog, rep } = useLoaderData<typeof loader>();
+   const navigate = useNavigate();
+   const issuedValue = new Date(quotation.issuedAt).toISOString().slice(0, 10);
+   const quotationId = quotation.id;
+ 
+   const [pane, setPane] = useState<"edit" | "preview">("edit");
+-  const [isLg, setIsLg] = useState<boolean | null>(null);
++  const [isLg, setIsLg] = useState<boolean>(() =>
++    typeof window === "undefined" ? false : window.matchMedia("(min-width: 1024px)").matches,
++  );
+   const [title, setTitle] = useState(quotation.title);
+   const [issuedAt, setIssuedAt] = useState(issuedValue);
+   const [status, setStatus] = useState(quotation.status);
+   const [location, setLocation] = useState(quotation.client.location ?? "");
+   const [document, setDocument] = useState(quotation.client.document ?? "");
+   const [notes, setNotes] = useState(quotation.notes ?? "");
+   const [lines, setLines] = useState<DraftLine[]>(() => quotation.lines.map(lineToDraft));
+   const [payments, setPayments] = useState<DraftPayment[]>(() =>
+     quotation.paymentOptions.map(paymentToDraft),
+   );
+@@ -257,21 +251,31 @@ export default function QuotationBuilder() {
+     setAutosaveHint(null);
+     setTitle(quotation.title);
+     setIssuedAt(new Date(quotation.issuedAt).toISOString().slice(0, 10));
+     setStatus(quotation.status);
+     setLocation(quotation.client.location ?? "");
+     setDocument(quotation.client.document ?? "");
+     setNotes(quotation.notes ?? "");
+     setLines(quotation.lines.map(lineToDraft));
+     setPayments(quotation.paymentOptions.map(paymentToDraft));
+     setActionError(null);
+-  }, [quotationId]);
++  }, [
++    quotationId,
++    quotation.client.document,
++    quotation.client.location,
++    quotation.issuedAt,
++    quotation.lines,
++    quotation.notes,
++    quotation.paymentOptions,
++    quotation.status,
++    quotation.title,
++  ]);
+ 
+   useEffect(() => {
+     if (ignoreDirtyUntilRef.current > 0) {
+       ignoreDirtyUntilRef.current -= 1;
+       return;
+     }
+     dirtyRef.current = true;
+     draftRevisionRef.current += 1;
+     setActionError(null);
+     setAutosaveHint(null);
+@@ -339,182 +343,190 @@ export default function QuotationBuilder() {
+     setActionError(null);
+   }
+ 
+   function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
+     event.preventDefault();
+     const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
+     const intent = submitter?.value === "save-print" ? "save-print" : "save";
+     submitQuotation(intent);
+   }
+ 
+-  function updateLine(clientKey: string, patch: Partial<DraftLine>) {
++  const updateLine = useCallback((clientKey: string, patch: Partial<DraftLine>) => {
+     setLines((prev) =>
+       prev.map((line) => {
+         if (line.clientKey !== clientKey) return line;
+         const next = { ...line, ...patch };
+         if (patch.priceInput !== undefined) {
+           next.unitPriceCents = parseBRLToCents(patch.priceInput) ?? line.unitPriceCents;
+         }
+         return next;
+       }),
+     );
+-  }
++  }, []);
+ 
+-  function updatePayment(clientKey: string, patch: Partial<DraftPayment>) {
++  const updatePayment = useCallback((clientKey: string, patch: Partial<DraftPayment>) => {
+     setPayments((prev) =>
+       prev.map((payment) => {
+         if (payment.clientKey !== clientKey) return payment;
+         const next = { ...payment, ...patch };
+         if (patch.amountInput !== undefined) {
+           next.amountCents = parseBRLToCents(patch.amountInput) ?? payment.amountCents;
+         }
+         return next;
+       }),
+     );
+-  }
++  }, []);
+ 
+-  function addBlankLine() {
++  const addBlankLine = useCallback(() => {
+     const clientKey = newClientKey();
+     setLines((prev) => [
+       ...prev,
+       {
+         id: null,
+         clientKey,
+         name: "Novo item",
+         quantity: 1,
+         description: "",
+         priceInput: "0,00",
+         unitPriceCents: 0,
+         catalogItemId: null,
+         imageId: null,
+         imageUrl: null,
++        imageThumbnail: null,
+       },
+     ]);
+-  }
++  }, []);
+ 
+-  function addFromCatalog() {
++  const addFromCatalog = useCallback(() => {
+     if (!catalogSelection) return;
+     const item = catalog.find((c) => String(c.id) === catalogSelection);
+     if (!item) return;
+     const clientKey = newClientKey();
+     const desc = Array.isArray(item.descriptionLines)
+       ? (item.descriptionLines as string[]).join("\n")
+       : "";
+     setLines((prev) => [
+       ...prev,
+       {
+         id: null,
+         clientKey,
+         name: item.name,
+         quantity: 1,
+         description: desc,
+         priceInput: centsToInput(item.defaultUnitPriceCents ?? 0),
+         unitPriceCents: item.defaultUnitPriceCents ?? 0,
+         catalogItemId: item.id,
+         imageId: item.imageId ?? null,
+         imageUrl: item.Image?.location ?? null,
++        imageThumbnail: null,
+       },
+     ]);
+     setCatalogSelection("");
+-  }
++  }, [catalog, catalogSelection]);
+ 
+-  function removeLine(clientKey: string) {
++  const removeLine = useCallback((clientKey: string) => {
+     setLines((prev) => prev.filter((line) => line.clientKey !== clientKey));
+-  }
++  }, []);
+ 
+-  function addPayment() {
++  const addPayment = useCallback(() => {
+     const clientKey = newClientKey();
+     setPayments((prev) => [
+       ...prev,
+       {
+         id: null,
+         clientKey,
+         label: "À vista",
+         amountInput: "0,00",
+         amountCents: 0,
+         detail: "",
+       },
+     ]);
+-  }
++  }, []);
+ 
+-  function removePayment(clientKey: string) {
++  const removePayment = useCallback((clientKey: string) => {
+     setPayments((prev) => prev.filter((payment) => payment.clientKey !== clientKey));
+-  }
++  }, []);
+ 
+-  async function handleLineImageUpload(clientKey: string, file: File) {
++  const handleLineImageUpload = useCallback(async (clientKey: string, file: File) => {
+     setLineUploadErrors((prev) => {
+       const next = { ...prev };
+       delete next[clientKey];
+       return next;
+     });
+ 
+     setLineUploadingKey(clientKey);
+     try {
+       const body = new FormData();
+       body.append("file", file);
+       body.append("folder", "quotes");
+       const res = await fetch("/admin/uploads", {
+         method: "POST",
+         body,
+         credentials: "same-origin",
+       });
+-      const data = (await res.json()) as { id?: number; location?: string; error?: string };
++      const data = (await res.json()) as { id?: number; location?: string; thumbnail?: string; error?: string };
+       if (!res.ok || data.error || data.id == null) {
+         setLineUploadErrors((prev) => ({
+           ...prev,
+           [clientKey]: data.error ?? "Falha no envio da imagem",
+         }));
+         return;
+       }
+ 
+-      updateLine(clientKey, { imageId: data.id, imageUrl: data.location ?? null });
++      updateLine(clientKey, {
++        imageId: data.id,
++        imageUrl: data.location ?? null,
++        imageThumbnail: data.thumbnail ?? null,
++      });
+     } catch {
+       setLineUploadErrors((prev) => ({
+         ...prev,
+         [clientKey]: "Falha no envio da imagem",
+       }));
+     } finally {
+       setLineUploadingKey(null);
+     }
+-  }
++  }, [updateLine]);
+ 
+   const previewInput = useMemo(
+     () => ({
+       title,
+       issuedAt,
+       client: {
+         name: quotation.client.name,
+         location: location || null,
+         document: document || null,
+       },
+       lines: lines.map((line) => ({
++        clientKey: line.clientKey,
+         name: line.name,
+         quantity: line.quantity,
+         descriptionLines: line.description
+           .split(/\n/)
+           .map((l) => l.trim())
+           .filter(Boolean),
+         unitPriceCents: line.unitPriceCents,
+         imageUrl: line.imageUrl,
++        thumbnailUrl: line.imageThumbnail,
+       })),
+       paymentOptions: payments.map((payment) => ({
++        clientKey: payment.clientKey,
+         label: payment.label,
+         amountCents: payment.amountCents,
+         detail: payment.detail || null,
+       })),
+       notes: notes || null,
+       rep,
+     }),
+     [title, issuedAt, quotation.client.name, location, document, lines, payments, notes, rep],
+   );
+-  const preview = useDebouncedValue(previewInput, 120);
+-  const showPreview = isLg === null || isLg || pane === "preview";
++  const showPreview = isLg || pane === "preview";
+ 
+   return (
+     <div className="min-h-screen bg-secondary/60 print:min-h-0 print:bg-white">
+       <div className="no-print border-b border-border bg-white">
+         <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3">
+           <div>
+             <p className="text-sm text-muted-foreground">
+               <Link to="/admin/quotations" className="underline-offset-2 hover:underline">
+                 Orçamentos
+               </Link>{" "}
+@@ -649,100 +661,31 @@ export default function QuotationBuilder() {
+                 type="button"
+                 size="sm"
+                 className="shrink-0"
+                 disabled={catalog.length === 0 || !catalogSelection}
+                 onClick={addFromCatalog}
+               >
+                 Adicionar
+               </Button>
+             </div>
+             {lines.map((line, i) => (
+-              <div key={line.clientKey} className="space-y-2 border border-border p-3">
+-                <div className="flex items-center justify-between gap-2">
+-                  <p className="text-xs text-muted-foreground">#{i + 1}</p>
+-                  <Button
+-                    type="button"
+-                    variant="ghost"
+-                    size="sm"
+-                    className="h-8 text-destructive hover:text-destructive"
+-                    onClick={() => removeLine(line.clientKey)}
+-                    aria-label="Remover item"
+-                  >
+-                    <Trash2 className="h-4 w-4" />
+-                    <span className="sr-only">Remover</span>
+-                  </Button>
+-                </div>
+-                <input type="hidden" name={`line.${i}.catalogItemId`} value={line.catalogItemId ?? ""} />
+-                <input type="hidden" name={`line.${i}.imageId`} value={line.imageId ?? ""} />
+-                <Input
+-                  name={`line.${i}.name`}
+-                  value={line.name}
+-                  onChange={(e) => updateLine(line.clientKey, { name: e.target.value })}
+-                  placeholder="Item"
+-                  required
+-                />
+-                <div className="grid grid-cols-2 gap-2">
+-                  <Input
+-                    name={`line.${i}.quantity`}
+-                    type="number"
+-                    min={1}
+-                    value={line.quantity}
+-                    onChange={(e) =>
+-                      updateLine(line.clientKey, {
+-                        quantity: Math.max(1, Number(e.target.value) || 1),
+-                      })
+-                    }
+-                    placeholder="Qtd"
+-                  />
+-                  <Input
+-                    name={`line.${i}.price`}
+-                    value={line.priceInput}
+-                    onChange={(e) => updateLine(line.clientKey, { priceInput: e.target.value })}
+-                    placeholder="Preço unit."
+-                  />
+-                </div>
+-                <textarea
+-                  name={`line.${i}.description`}
+-                  rows={3}
+-                  value={line.description}
+-                  onChange={(e) => updateLine(line.clientKey, { description: e.target.value })}
+-                  placeholder="Descrição (uma linha por bullet)"
+-                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
+-                />
+-                {line.imageUrl ? (
+-                  <img
+-                    src={line.imageUrl}
+-                    alt=""
+-                    className="h-16 w-16 rounded border border-border object-cover"
+-                  />
+-                ) : null}
+-                <div>
+-                  <Label htmlFor={`line-img-${line.clientKey}`}>Imagem do item</Label>
+-                  <FileButton
+-                    id={`line-img-${line.clientKey}`}
+-                    className="mt-1"
+-                    disabled={busy || lineUploadingKey === line.clientKey}
+-                    busy={busy || lineUploadingKey === line.clientKey}
+-                    onFile={(file) => void handleLineImageUpload(line.clientKey, file)}
+-                  />
+-                  {lineUploadErrors[line.clientKey] ? (
+-                    <p className="mt-1 text-sm text-destructive">
+-                      {lineUploadErrors[line.clientKey]}
+-                    </p>
+-                  ) : null}
+-                </div>
+-                {line.quantity * line.unitPriceCents > 0 ? (
+-                  <p className="text-right text-sm text-heat">
+-                    Valor: {formatBRL(line.quantity * line.unitPriceCents)}
+-                  </p>
+-                ) : null}
+-              </div>
++              <QuotationEditorLineRow
++                key={line.clientKey}
++                line={line}
++                index={i}
++                busy={busy}
++                lineUploading={lineUploadingKey === line.clientKey}
++                uploadError={lineUploadErrors[line.clientKey]}
++                onRemove={removeLine}
++                onChange={updateLine}
++                onUpload={handleLineImageUpload}
++              />
+             ))}
+           </section>
+ 
+           <section className="space-y-3">
+             <h2 className="font-display text-lg font-semibold">Notas / garantia</h2>
+             <textarea
+               name="notes"
+               rows={5}
+               value={notes}
+               onChange={(e) => setNotes(e.target.value)}
+@@ -752,53 +695,27 @@ export default function QuotationBuilder() {
+           </section>
+ 
+           <section className="space-y-3">
+             <div className="flex flex-wrap items-center justify-between gap-2">
+               <h2 className="font-display text-lg font-semibold">Formas de pagamento</h2>
+               <Button type="button" variant="outline" size="sm" onClick={addPayment}>
+                 + Pagamento
+               </Button>
+             </div>
+             {payments.map((opt, i) => (
+-              <div key={opt.clientKey} className="space-y-2 border border-border p-3">
+-                <div className="flex justify-end">
+-                  <Button
+-                    type="button"
+-                    variant="ghost"
+-                    size="sm"
+-                    className="h-8 text-destructive hover:text-destructive"
+-                    onClick={() => removePayment(opt.clientKey)}
+-                    aria-label="Remover pagamento"
+-                  >
+-                    <Trash2 className="h-4 w-4" />
+-                    <span className="sr-only">Remover</span>
+-                  </Button>
+-                </div>
+-                <Input
+-                  name={`pay.${i}.label`}
+-                  value={opt.label}
+-                  onChange={(e) => updatePayment(opt.clientKey, { label: e.target.value })}
+-                  placeholder="Rótulo"
+-                />
+-                <Input
+-                  name={`pay.${i}.amount`}
+-                  value={opt.amountInput}
+-                  onChange={(e) => updatePayment(opt.clientKey, { amountInput: e.target.value })}
+-                  placeholder="Valor total da opção"
+-                />
+-                <Input
+-                  name={`pay.${i}.detail`}
+-                  value={opt.detail}
+-                  onChange={(e) => updatePayment(opt.clientKey, { detail: e.target.value })}
+-                  placeholder="Detalhe (opcional)"
+-                />
+-              </div>
++              <QuotationEditorPaymentRow
++                key={opt.clientKey}
++                payment={opt}
++                index={i}
++                onRemove={removePayment}
++                onChange={updatePayment}
++              />
+             ))}
+           </section>
+ 
+           <div className="flex flex-wrap items-center gap-2">
+             <Button type="submit" name="intent" value="save" disabled={busy}>
+               Salvar
+             </Button>
+             <Button type="submit" name="intent" value="save-print" variant="outline" disabled={busy}>
+               Salvar e imprimir
+             </Button>
+@@ -812,27 +729,19 @@ export default function QuotationBuilder() {
+ 
+         <div
+           className={cn(
+             "space-y-3 self-start lg:sticky lg:top-4 print:static",
+             pane !== "preview" && "hidden lg:block print:block",
+           )}
+         >
+           {showPreview ? (
+             <div className="overflow-x-auto border border-border bg-zinc-200/60 p-2 print:flex print:justify-center print:overflow-visible print:border-0 print:bg-white print:p-0 sm:p-4">
+               <div className="origin-top-left min-w-[320px] print:min-w-0">
+-                <QuotationDocument
+-                  title={preview.title}
+-                  issuedAt={preview.issuedAt}
+-                  client={preview.client}
+-                  lines={preview.lines}
+-                  paymentOptions={preview.paymentOptions}
+-                  notes={preview.notes}
+-                  rep={preview.rep}
+-                />
++                <QuotationPreview {...previewInput} />
+               </div>
+             </div>
+           ) : null}
+         </div>
+       </div>
+     </div>
+   );
+ }
+diff --git a/app/routes/admin.quotations.$id_.print.tsx b/app/routes/admin.quotations.$id_.print.tsx
+index e851664..f17e615 100644
+--- a/app/routes/admin.quotations.$id_.print.tsx
++++ b/app/routes/admin.quotations.$id_.print.tsx
+@@ -75,21 +75,26 @@ export default function QuotationPrint() {
+           Imprimir / PDF
+         </Button>
+       </div>
+       <div className="flex justify-center p-4 print:block print:p-0">
+         <QuotationDocument
+           title={quotation.title}
+           issuedAt={quotation.issuedAt}
+           client={quotation.client}
+           lines={quotation.lines.map((line) => ({
+             ...line,
++            clientKey: String(line.id),
+             imageUrl: line.Image?.location ?? null,
++            thumbnailUrl: line.Image?.thumbnail ?? null,
++          }))}
++          paymentOptions={quotation.paymentOptions.map((option) => ({
++            ...option,
++            clientKey: String(option.id),
+           }))}
+-          paymentOptions={quotation.paymentOptions}
+           notes={quotation.notes}
+           rep={rep}
+           printMode
+         />
+       </div>
+     </div>
+   );
+ }
diff --git a/app/components/admin/QuotationDocument.tsx b/app/components/admin/QuotationDocument.tsx
index 06ef248..d4f7b36 100644
--- a/app/components/admin/QuotationDocument.tsx
+++ b/app/components/admin/QuotationDocument.tsx
@@ -4,24 +4,26 @@ import type { QuotationLine, QuotationPaymentOption, QuoteClient } from "@prisma
 import { formatBRL, quotationTotalCents, splitNoteLines } from "~/utils/quotation";
 import { formatTaxId, taxIdLabel } from "~/utils/tax-id";
 import { QUOTE_COMPANY, type QuoteRepProfile } from "~/lib/site";
 
 type QuotationDocumentProps = {
   title: string;
   issuedAt: Date | string;
   client: Pick<QuoteClient, "name" | "location" | "document">;
   lines: Array<
     Pick<QuotationLine, "name" | "quantity" | "descriptionLines" | "unitPriceCents"> & {
+      clientKey?: string;
       imageUrl?: string | null;
+      thumbnailUrl?: string | null;
     }
   >;
-  paymentOptions: Array<Pick<QuotationPaymentOption, "label" | "amountCents" | "detail">>;
+  paymentOptions: Array<Pick<QuotationPaymentOption, "label" | "amountCents" | "detail"> & { clientKey?: string }>;
   notes: string | null;
   rep: QuoteRepProfile;
   /** Dedicated print page: no screen chrome, print stylesheet applies. */
   printMode?: boolean;
 };
 
 function asDate(value: Date | string) {
   return value instanceof Date ? value : new Date(value);
 }
 
@@ -102,46 +104,45 @@ export const QuotationDocument = memo(function QuotationDocument({
       <div className="quote-doc__table-head" role="row">
         <span>Item</span>
         <span>Qtd.</span>
         <span>Descrição</span>
       </div>
 
       <ol className="quote-doc__lines">
         {lines.map((line, index) => {
           const bullets = descLines(line.descriptionLines);
           const lineTotal = line.quantity * line.unitPriceCents;
-          const hasPhoto = Boolean(line.imageUrl);
+          const imageSrc = line.thumbnailUrl ?? line.imageUrl;
+          const hasPhoto = Boolean(imageSrc);
           return (
-            <li key={`${line.name}-${index}`} className="quote-doc__line">
+            <li key={line.clientKey ?? `${line.name}-${line.quantity}-${line.unitPriceCents}`} className="quote-doc__line">
               <div className="quote-doc__line-main">
                 <span className="quote-doc__line-num">{index + 1}</span>
                 <div
                   className={
                     hasPhoto
                       ? "quote-doc__line-body"
                       : "quote-doc__line-body quote-doc__line-body--no-photo"
                   }
                 >
                   <p className="quote-doc__line-name">{line.name}</p>
                   <span className="quote-doc__line-qty">{line.quantity}</span>
                   {bullets.length > 0 ? (
                     <ul className="quote-doc__line-desc">
                       {bullets.map((b) => (
                         <li key={b}>{b}</li>
                       ))}
                     </ul>
                   ) : (
                     <span className="quote-doc__line-desc-empty" />
                   )}
-                  {hasPhoto ? (
-                    <img className="quote-doc__line-photo" src={line.imageUrl ?? ""} alt="" />
-                  ) : null}
+                  {hasPhoto ? <img className="quote-doc__line-photo" src={imageSrc ?? ""} alt="" /> : null}
                 </div>
               </div>
               {lineTotal > 0 ? (
                 <p className="quote-doc__line-price">
                   Valor: <strong>{formatBRL(lineTotal)}</strong>
                 </p>
               ) : null}
             </li>
           );
         })}
@@ -158,22 +159,22 @@ export const QuotationDocument = memo(function QuotationDocument({
               <li key={item}>{item}</li>
             ))}
           </ul>
         ) : null}
       </section>
 
       {paymentOptions.length > 0 ? (
         <section className="quote-doc__payments">
           <h2>formas de pagamento</h2>
           <ul>
-            {paymentOptions.map((opt, i) => (
-              <li key={`${opt.label}-${i}`}>
+            {paymentOptions.map((opt) => (
+              <li key={opt.clientKey ?? `${opt.label}-${opt.amountCents}`}>
                 <span className="quote-doc__pay-label">{opt.label}</span>
                 <span className="quote-doc__pay-amount">{formatBRL(opt.amountCents)}</span>
                 {opt.detail ? <span className="quote-doc__pay-detail">{opt.detail}</span> : null}
               </li>
             ))}
           </ul>
         </section>
       ) : null}
       </article>
 
diff --git a/app/components/admin/QuotationEditorRows.tsx b/app/components/admin/QuotationEditorRows.tsx
new file mode 100644
index 0000000..c9b414c
--- /dev/null
+++ b/app/components/admin/QuotationEditorRows.tsx
@@ -0,0 +1,176 @@
+import { memo } from "react";
+import { Trash2 } from "lucide-react";
+
+import { Button } from "~/components/ui/button";
+import { FileButton } from "~/components/ui/file-button";
+import { Input } from "~/components/ui/input";
+import { Label } from "~/components/ui/label";
+import { formatBRL } from "~/utils/quotation";
+
+export type QuotationEditorLine = {
+  id: number | null;
+  clientKey: string;
+  name: string;
+  quantity: number;
+  description: string;
+  priceInput: string;
+  unitPriceCents: number;
+  catalogItemId: number | null;
+  imageId: number | null;
+  imageUrl: string | null;
+  imageThumbnail: string | null;
+};
+
+export type QuotationEditorPayment = {
+  id: number | null;
+  clientKey: string;
+  label: string;
+  amountInput: string;
+  amountCents: number;
+  detail: string;
+};
+
+type QuotationEditorLineRowProps = {
+  line: QuotationEditorLine;
+  index: number;
+  busy: boolean;
+  lineUploading: boolean;
+  uploadError?: string;
+  onRemove(clientKey: string): void;
+  onChange(clientKey: string, patch: Partial<QuotationEditorLine>): void;
+  onUpload(clientKey: string, file: File): void;
+};
+
+export const QuotationEditorLineRow = memo(function QuotationEditorLineRow({
+  line,
+  index,
+  busy,
+  lineUploading,
+  uploadError,
+  onRemove,
+  onChange,
+  onUpload,
+}: QuotationEditorLineRowProps) {
+  const imageSrc = line.imageThumbnail ?? line.imageUrl;
+
+  return (
+    <div className="space-y-2 border border-border p-3">
+      <div className="flex items-center justify-between gap-2">
+        <p className="text-xs text-muted-foreground">#{index + 1}</p>
+        <Button
+          type="button"
+          variant="ghost"
+          size="sm"
+          className="h-8 text-destructive hover:text-destructive"
+          onClick={() => onRemove(line.clientKey)}
+          aria-label="Remover item"
+        >
+          <Trash2 className="h-4 w-4" />
+          <span className="sr-only">Remover</span>
+        </Button>
+      </div>
+      <input type="hidden" name={`line.${index}.catalogItemId`} value={line.catalogItemId ?? ""} />
+      <input type="hidden" name={`line.${index}.imageId`} value={line.imageId ?? ""} />
+      <Input
+        name={`line.${index}.name`}
+        value={line.name}
+        onChange={(e) => onChange(line.clientKey, { name: e.target.value })}
+        placeholder="Item"
+        required
+      />
+      <div className="grid grid-cols-2 gap-2">
+        <Input
+          name={`line.${index}.quantity`}
+          type="number"
+          min={1}
+          value={line.quantity}
+          onChange={(e) =>
+            onChange(line.clientKey, {
+              quantity: Math.max(1, Number(e.target.value) || 1),
+            })
+          }
+          placeholder="Qtd"
+        />
+        <Input
+          name={`line.${index}.price`}
+          value={line.priceInput}
+          onChange={(e) => onChange(line.clientKey, { priceInput: e.target.value })}
+          placeholder="Preço unit."
+        />
+      </div>
+      <textarea
+        name={`line.${index}.description`}
+        rows={3}
+        value={line.description}
+        onChange={(e) => onChange(line.clientKey, { description: e.target.value })}
+        placeholder="Descrição (uma linha por bullet)"
+        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
+      />
+      {imageSrc ? <img src={imageSrc} alt="" className="h-16 w-16 rounded border border-border object-cover" /> : null}
+      <div>
+        <Label htmlFor={`line-img-${line.clientKey}`}>Imagem do item</Label>
+        <FileButton
+          id={`line-img-${line.clientKey}`}
+          className="mt-1"
+          disabled={busy || lineUploading}
+          busy={busy || lineUploading}
+          onFile={(file) => onUpload(line.clientKey, file)}
+        />
+        {uploadError ? <p className="mt-1 text-sm text-destructive">{uploadError}</p> : null}
+      </div>
+      {line.quantity * line.unitPriceCents > 0 ? (
+        <p className="text-right text-sm text-heat">Valor: {formatBRL(line.quantity * line.unitPriceCents)}</p>
+      ) : null}
+    </div>
+  );
+});
+
+type QuotationEditorPaymentRowProps = {
+  payment: QuotationEditorPayment;
+  index: number;
+  onRemove(clientKey: string): void;
+  onChange(clientKey: string, patch: Partial<QuotationEditorPayment>): void;
+};
+
+export const QuotationEditorPaymentRow = memo(function QuotationEditorPaymentRow({
+  payment,
+  index,
+  onRemove,
+  onChange,
+}: QuotationEditorPaymentRowProps) {
+  return (
+    <div className="space-y-2 border border-border p-3">
+      <div className="flex justify-end">
+        <Button
+          type="button"
+          variant="ghost"
+          size="sm"
+          className="h-8 text-destructive hover:text-destructive"
+          onClick={() => onRemove(payment.clientKey)}
+          aria-label="Remover pagamento"
+        >
+          <Trash2 className="h-4 w-4" />
+          <span className="sr-only">Remover</span>
+        </Button>
+      </div>
+      <Input
+        name={`pay.${index}.label`}
+        value={payment.label}
+        onChange={(e) => onChange(payment.clientKey, { label: e.target.value })}
+        placeholder="Rótulo"
+      />
+      <Input
+        name={`pay.${index}.amount`}
+        value={payment.amountInput}
+        onChange={(e) => onChange(payment.clientKey, { amountInput: e.target.value })}
+        placeholder="Valor total da opção"
+      />
+      <Input
+        name={`pay.${index}.detail`}
+        value={payment.detail}
+        onChange={(e) => onChange(payment.clientKey, { detail: e.target.value })}
+        placeholder="Detalhe (opcional)"
+      />
+    </div>
+  );
+});
diff --git a/app/components/admin/QuotationPreview.tsx b/app/components/admin/QuotationPreview.tsx
new file mode 100644
index 0000000..1a88540
--- /dev/null
+++ b/app/components/admin/QuotationPreview.tsx
@@ -0,0 +1,47 @@
+import { memo, useDeferredValue } from "react";
+
+import { QuotationDocument } from "~/components/admin/QuotationDocument";
+import type { QuoteRepProfile } from "~/lib/site";
+
+export type QuotationPreviewProps = {
+  title: string;
+  issuedAt: string;
+  client: {
+    name: string;
+    location: string | null;
+    document: string | null;
+  };
+  lines: Array<{
+    clientKey: string;
+    name: string;
+    quantity: number;
+    descriptionLines: string[];
+    unitPriceCents: number;
+    imageUrl?: string | null;
+    thumbnailUrl?: string | null;
+  }>;
+  paymentOptions: Array<{
+    clientKey: string;
+    label: string;
+    amountCents: number;
+    detail: string | null;
+  }>;
+  notes: string | null;
+  rep: QuoteRepProfile;
+};
+
+export const QuotationPreview = memo(function QuotationPreview(props: QuotationPreviewProps) {
+  const preview = useDeferredValue(props);
+
+  return (
+    <QuotationDocument
+      title={preview.title}
+      issuedAt={preview.issuedAt}
+      client={preview.client}
+      lines={preview.lines}
+      paymentOptions={preview.paymentOptions}
+      notes={preview.notes}
+      rep={preview.rep}
+    />
+  );
+});
diff --git a/app/components/admin/quotation-editor.test.tsx b/app/components/admin/quotation-editor.test.tsx
new file mode 100644
index 0000000..591e95b
--- /dev/null
+++ b/app/components/admin/quotation-editor.test.tsx
@@ -0,0 +1,36 @@
+import { readFileSync } from "node:fs";
+import { resolve } from "node:path";
+
+import { expect, test } from "vitest";
+
+const root = resolve(process.cwd());
+const read = (path: string) => readFileSync(resolve(root, path), "utf8");
+
+test("quotation editor rows are memoized", () => {
+  const rows = read("app/components/admin/QuotationEditorRows.tsx");
+  expect(rows).toContain("export const QuotationEditorLineRow = memo");
+  expect(rows).toContain("export const QuotationEditorPaymentRow = memo");
+});
+
+test("quotation preview is deferred and editor route avoids time-based debounce", () => {
+  const preview = read("app/components/admin/QuotationPreview.tsx");
+  expect(preview).toContain("useDeferredValue");
+
+  const route = read("app/routes/admin.quotations.$id.tsx");
+  expect(route).not.toContain("useDebouncedValue");
+  expect(route).not.toContain("120");
+  expect(route).toContain("QuotationPreview");
+  expect(route).toContain("useCallback");
+});
+
+test("document and print keys use stable row keys and thumbnail fallback", () => {
+  const doc = read("app/components/admin/QuotationDocument.tsx");
+  expect(doc).toContain("clientKey ?? `${line.name}-${line.quantity}-${line.unitPriceCents}`");
+  expect(doc).toContain("thumbnailUrl ?? line.imageUrl");
+  expect(doc).toContain("clientKey ?? `${opt.label}-${opt.amountCents}`");
+
+  const printRoute = read("app/routes/admin.quotations.$id_.print.tsx");
+  expect(printRoute).toContain("clientKey: String(line.id)");
+  expect(printRoute).toContain("thumbnailUrl: line.Image?.thumbnail ?? null");
+  expect(printRoute).toContain("clientKey: String(option.id)");
+});
diff --git a/app/models/quotation.server.ts b/app/models/quotation.server.ts
index b8adb33..a01b994 100644
--- a/app/models/quotation.server.ts
+++ b/app/models/quotation.server.ts
@@ -1,18 +1,18 @@
 import type { Prisma, QuoteCatalogItem, QuoteClient, Quotation, QuotationLine, QuotationPaymentOption } from "@prisma/client";
 
 import prisma from "~/libs/prisma/client.server";
 
 export type QuotationWithRelations = Quotation & {
   client: QuoteClient;
-  lines: (QuotationLine & { Image: { id: number; location: string } | null })[];
-  paymentOptions: QuotationPaymentOption[];
+  lines: (QuotationLine & { Image: { id: number; location: string; thumbnail?: string | null } | null })[];
+  paymentOptions: (QuotationPaymentOption & { clientKey?: string })[];
 };
 
 export async function listQuoteClients() {
   return prisma.quoteClient.findMany({ orderBy: { name: "asc" } });
 }
 
 export async function getQuoteClient(id: number) {
   return prisma.quoteClient.findUnique({ where: { id } });
 }
 
diff --git a/app/routes/admin.quotations.$id.tsx b/app/routes/admin.quotations.$id.tsx
index 43efeb9..4831f95 100644
--- a/app/routes/admin.quotations.$id.tsx
+++ b/app/routes/admin.quotations.$id.tsx
@@ -1,26 +1,25 @@
 import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
 import { json, redirect } from "@remix-run/node";
 import { Form, Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
-import { Trash2 } from "lucide-react";
-import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
-import { QuotationDocument } from "~/components/admin/QuotationDocument";
+import { useEffect, useMemo, useRef, useState, type FormEvent, useCallback } from "react";
+import { QuotationEditorLineRow, QuotationEditorPaymentRow } from "~/components/admin/QuotationEditorRows";
+import { QuotationPreview } from "~/components/admin/QuotationPreview";
 import { Button } from "~/components/ui/button";
-import { FileButton } from "~/components/ui/file-button";
 import { TaxIdInput } from "~/components/ui/tax-id-input";
 import { Input } from "~/components/ui/input";
 import { Label } from "~/components/ui/label";
 import { cn } from "~/lib/utils";
 import { buildNoIndexMeta } from "~/lib/seo";
 import { SITE_NAME, resolveQuoteRep } from "~/lib/site";
 import { saveQuotation, getQuotation, listCatalogItems } from "~/models/quotation.server";
-import { formatBRL, parseBRLToCents } from "~/utils/quotation";
+import { parseBRLToCents } from "~/utils/quotation";
 import quotationStyles from "~/styles/quotation-document.css?url";
 import { requireAdmin } from "~/utils/require-admin.server";
 import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
 
 export const links: LinksFunction = () => [{ rel: "stylesheet", href: quotationStyles }];
 
 export const meta: MetaFunction<typeof loader> = ({ data }) =>
   buildNoIndexMeta(`${data?.quotation.title ?? "Orçamento"} | ${SITE_NAME}`);
 
 export const loader = async ({ request, params }: LoaderFunctionArgs) => {
@@ -37,20 +36,21 @@ type DraftLine = {
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
+  imageThumbnail: string | null;
 };
 
 type DraftPayment = {
   id: number | null;
   clientKey: string;
   label: string;
   amountInput: string;
   amountCents: number;
   detail: string;
 };
@@ -61,33 +61,34 @@ function descToString(raw: unknown) {
 }
 
 function lineToDraft(line: {
   id: number;
   name: string;
   quantity: number;
   descriptionLines: unknown;
   unitPriceCents: number;
   catalogItemId: number | null;
   imageId: number | null;
-  Image: { location: string } | null;
+  Image: { location: string; thumbnail?: string | null } | null;
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
+    imageThumbnail: line.Image?.thumbnail ?? null,
   };
 }
 
 function paymentToDraft(opt: {
   id: number;
   label: string;
   amountCents: number;
   detail: string | null;
 }): DraftPayment {
   return {
@@ -187,37 +188,30 @@ export const shouldRevalidate = ({ actionResult, defaultShouldRevalidate }: Shou
 function centsToInput(cents: number) {
   return (cents / 100).toFixed(2).replace(".", ",");
 }
 
 function newClientKey() {
   return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
 }
 
 const AUTOSAVE_EVERY_MS = 2 * 60 * 1000;
 
-function useDebouncedValue<T>(value: T, delayMs: number) {
-  const [debounced, setDebounced] = useState(value);
-  useEffect(() => {
-    const timer = window.setTimeout(() => setDebounced(value), delayMs);
-    return () => window.clearTimeout(timer);
-  }, [value, delayMs]);
-  return debounced;
-}
-
 export default function QuotationBuilder() {
   const { quotation, catalog, rep } = useLoaderData<typeof loader>();
   const navigate = useNavigate();
   const issuedValue = new Date(quotation.issuedAt).toISOString().slice(0, 10);
   const quotationId = quotation.id;
 
   const [pane, setPane] = useState<"edit" | "preview">("edit");
-  const [isLg, setIsLg] = useState<boolean | null>(null);
+  const [isLg, setIsLg] = useState<boolean>(() =>
+    typeof window === "undefined" ? false : window.matchMedia("(min-width: 1024px)").matches,
+  );
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
@@ -257,21 +251,31 @@ export default function QuotationBuilder() {
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
-  }, [quotationId]);
+  }, [
+    quotationId,
+    quotation.client.document,
+    quotation.client.location,
+    quotation.issuedAt,
+    quotation.lines,
+    quotation.notes,
+    quotation.paymentOptions,
+    quotation.status,
+    quotation.title,
+  ]);
 
   useEffect(() => {
     if (ignoreDirtyUntilRef.current > 0) {
       ignoreDirtyUntilRef.current -= 1;
       return;
     }
     dirtyRef.current = true;
     draftRevisionRef.current += 1;
     setActionError(null);
     setAutosaveHint(null);
@@ -339,182 +343,190 @@ export default function QuotationBuilder() {
     setActionError(null);
   }
 
   function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
     event.preventDefault();
     const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
     const intent = submitter?.value === "save-print" ? "save-print" : "save";
     submitQuotation(intent);
   }
 
-  function updateLine(clientKey: string, patch: Partial<DraftLine>) {
+  const updateLine = useCallback((clientKey: string, patch: Partial<DraftLine>) => {
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
-  }
+  }, []);
 
-  function updatePayment(clientKey: string, patch: Partial<DraftPayment>) {
+  const updatePayment = useCallback((clientKey: string, patch: Partial<DraftPayment>) => {
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
-  }
+  }, []);
 
-  function addBlankLine() {
+  const addBlankLine = useCallback(() => {
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
+        imageThumbnail: null,
       },
     ]);
-  }
+  }, []);
 
-  function addFromCatalog() {
+  const addFromCatalog = useCallback(() => {
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
+        imageThumbnail: null,
       },
     ]);
     setCatalogSelection("");
-  }
+  }, [catalog, catalogSelection]);
 
-  function removeLine(clientKey: string) {
+  const removeLine = useCallback((clientKey: string) => {
     setLines((prev) => prev.filter((line) => line.clientKey !== clientKey));
-  }
+  }, []);
 
-  function addPayment() {
+  const addPayment = useCallback(() => {
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
-  }
+  }, []);
 
-  function removePayment(clientKey: string) {
+  const removePayment = useCallback((clientKey: string) => {
     setPayments((prev) => prev.filter((payment) => payment.clientKey !== clientKey));
-  }
+  }, []);
 
-  async function handleLineImageUpload(clientKey: string, file: File) {
+  const handleLineImageUpload = useCallback(async (clientKey: string, file: File) => {
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
-      const data = (await res.json()) as { id?: number; location?: string; error?: string };
+      const data = (await res.json()) as { id?: number; location?: string; thumbnail?: string; error?: string };
       if (!res.ok || data.error || data.id == null) {
         setLineUploadErrors((prev) => ({
           ...prev,
           [clientKey]: data.error ?? "Falha no envio da imagem",
         }));
         return;
       }
 
-      updateLine(clientKey, { imageId: data.id, imageUrl: data.location ?? null });
+      updateLine(clientKey, {
+        imageId: data.id,
+        imageUrl: data.location ?? null,
+        imageThumbnail: data.thumbnail ?? null,
+      });
     } catch {
       setLineUploadErrors((prev) => ({
         ...prev,
         [clientKey]: "Falha no envio da imagem",
       }));
     } finally {
       setLineUploadingKey(null);
     }
-  }
+  }, [updateLine]);
 
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
+        clientKey: line.clientKey,
         name: line.name,
         quantity: line.quantity,
         descriptionLines: line.description
           .split(/\n/)
           .map((l) => l.trim())
           .filter(Boolean),
         unitPriceCents: line.unitPriceCents,
         imageUrl: line.imageUrl,
+        thumbnailUrl: line.imageThumbnail,
       })),
       paymentOptions: payments.map((payment) => ({
+        clientKey: payment.clientKey,
         label: payment.label,
         amountCents: payment.amountCents,
         detail: payment.detail || null,
       })),
       notes: notes || null,
       rep,
     }),
     [title, issuedAt, quotation.client.name, location, document, lines, payments, notes, rep],
   );
-  const preview = useDebouncedValue(previewInput, 120);
-  const showPreview = isLg === null || isLg || pane === "preview";
+  const showPreview = isLg || pane === "preview";
 
   return (
     <div className="min-h-screen bg-secondary/60 print:min-h-0 print:bg-white">
       <div className="no-print border-b border-border bg-white">
         <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3">
           <div>
             <p className="text-sm text-muted-foreground">
               <Link to="/admin/quotations" className="underline-offset-2 hover:underline">
                 Orçamentos
               </Link>{" "}
@@ -649,100 +661,31 @@ export default function QuotationBuilder() {
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
-              <div key={line.clientKey} className="space-y-2 border border-border p-3">
-                <div className="flex items-center justify-between gap-2">
-                  <p className="text-xs text-muted-foreground">#{i + 1}</p>
-                  <Button
-                    type="button"
-                    variant="ghost"
-                    size="sm"
-                    className="h-8 text-destructive hover:text-destructive"
-                    onClick={() => removeLine(line.clientKey)}
-                    aria-label="Remover item"
-                  >
-                    <Trash2 className="h-4 w-4" />
-                    <span className="sr-only">Remover</span>
-                  </Button>
-                </div>
-                <input type="hidden" name={`line.${i}.catalogItemId`} value={line.catalogItemId ?? ""} />
-                <input type="hidden" name={`line.${i}.imageId`} value={line.imageId ?? ""} />
-                <Input
-                  name={`line.${i}.name`}
-                  value={line.name}
-                  onChange={(e) => updateLine(line.clientKey, { name: e.target.value })}
-                  placeholder="Item"
-                  required
-                />
-                <div className="grid grid-cols-2 gap-2">
-                  <Input
-                    name={`line.${i}.quantity`}
-                    type="number"
-                    min={1}
-                    value={line.quantity}
-                    onChange={(e) =>
-                      updateLine(line.clientKey, {
-                        quantity: Math.max(1, Number(e.target.value) || 1),
-                      })
-                    }
-                    placeholder="Qtd"
-                  />
-                  <Input
-                    name={`line.${i}.price`}
-                    value={line.priceInput}
-                    onChange={(e) => updateLine(line.clientKey, { priceInput: e.target.value })}
-                    placeholder="Preço unit."
-                  />
-                </div>
-                <textarea
-                  name={`line.${i}.description`}
-                  rows={3}
-                  value={line.description}
-                  onChange={(e) => updateLine(line.clientKey, { description: e.target.value })}
-                  placeholder="Descrição (uma linha por bullet)"
-                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
-                />
-                {line.imageUrl ? (
-                  <img
-                    src={line.imageUrl}
-                    alt=""
-                    className="h-16 w-16 rounded border border-border object-cover"
-                  />
-                ) : null}
-                <div>
-                  <Label htmlFor={`line-img-${line.clientKey}`}>Imagem do item</Label>
-                  <FileButton
-                    id={`line-img-${line.clientKey}`}
-                    className="mt-1"
-                    disabled={busy || lineUploadingKey === line.clientKey}
-                    busy={busy || lineUploadingKey === line.clientKey}
-                    onFile={(file) => void handleLineImageUpload(line.clientKey, file)}
-                  />
-                  {lineUploadErrors[line.clientKey] ? (
-                    <p className="mt-1 text-sm text-destructive">
-                      {lineUploadErrors[line.clientKey]}
-                    </p>
-                  ) : null}
-                </div>
-                {line.quantity * line.unitPriceCents > 0 ? (
-                  <p className="text-right text-sm text-heat">
-                    Valor: {formatBRL(line.quantity * line.unitPriceCents)}
-                  </p>
-                ) : null}
-              </div>
+              <QuotationEditorLineRow
+                key={line.clientKey}
+                line={line}
+                index={i}
+                busy={busy}
+                lineUploading={lineUploadingKey === line.clientKey}
+                uploadError={lineUploadErrors[line.clientKey]}
+                onRemove={removeLine}
+                onChange={updateLine}
+                onUpload={handleLineImageUpload}
+              />
             ))}
           </section>
 
           <section className="space-y-3">
             <h2 className="font-display text-lg font-semibold">Notas / garantia</h2>
             <textarea
               name="notes"
               rows={5}
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
@@ -752,53 +695,27 @@ export default function QuotationBuilder() {
           </section>
 
           <section className="space-y-3">
             <div className="flex flex-wrap items-center justify-between gap-2">
               <h2 className="font-display text-lg font-semibold">Formas de pagamento</h2>
               <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                 + Pagamento
               </Button>
             </div>
             {payments.map((opt, i) => (
-              <div key={opt.clientKey} className="space-y-2 border border-border p-3">
-                <div className="flex justify-end">
-                  <Button
-                    type="button"
-                    variant="ghost"
-                    size="sm"
-                    className="h-8 text-destructive hover:text-destructive"
-                    onClick={() => removePayment(opt.clientKey)}
-                    aria-label="Remover pagamento"
-                  >
-                    <Trash2 className="h-4 w-4" />
-                    <span className="sr-only">Remover</span>
-                  </Button>
-                </div>
-                <Input
-                  name={`pay.${i}.label`}
-                  value={opt.label}
-                  onChange={(e) => updatePayment(opt.clientKey, { label: e.target.value })}
-                  placeholder="Rótulo"
-                />
-                <Input
-                  name={`pay.${i}.amount`}
-                  value={opt.amountInput}
-                  onChange={(e) => updatePayment(opt.clientKey, { amountInput: e.target.value })}
-                  placeholder="Valor total da opção"
-                />
-                <Input
-                  name={`pay.${i}.detail`}
-                  value={opt.detail}
-                  onChange={(e) => updatePayment(opt.clientKey, { detail: e.target.value })}
-                  placeholder="Detalhe (opcional)"
-                />
-              </div>
+              <QuotationEditorPaymentRow
+                key={opt.clientKey}
+                payment={opt}
+                index={i}
+                onRemove={removePayment}
+                onChange={updatePayment}
+              />
             ))}
           </section>
 
           <div className="flex flex-wrap items-center gap-2">
             <Button type="submit" name="intent" value="save" disabled={busy}>
               Salvar
             </Button>
             <Button type="submit" name="intent" value="save-print" variant="outline" disabled={busy}>
               Salvar e imprimir
             </Button>
@@ -812,27 +729,19 @@ export default function QuotationBuilder() {
 
         <div
           className={cn(
             "space-y-3 self-start lg:sticky lg:top-4 print:static",
             pane !== "preview" && "hidden lg:block print:block",
           )}
         >
           {showPreview ? (
             <div className="overflow-x-auto border border-border bg-zinc-200/60 p-2 print:flex print:justify-center print:overflow-visible print:border-0 print:bg-white print:p-0 sm:p-4">
               <div className="origin-top-left min-w-[320px] print:min-w-0">
-                <QuotationDocument
-                  title={preview.title}
-                  issuedAt={preview.issuedAt}
-                  client={preview.client}
-                  lines={preview.lines}
-                  paymentOptions={preview.paymentOptions}
-                  notes={preview.notes}
-                  rep={preview.rep}
-                />
+                <QuotationPreview {...previewInput} />
               </div>
             </div>
           ) : null}
         </div>
       </div>
     </div>
   );
 }
diff --git a/app/routes/admin.quotations.$id_.print.tsx b/app/routes/admin.quotations.$id_.print.tsx
index e851664..f17e615 100644
--- a/app/routes/admin.quotations.$id_.print.tsx
+++ b/app/routes/admin.quotations.$id_.print.tsx
@@ -75,21 +75,26 @@ export default function QuotationPrint() {
           Imprimir / PDF
         </Button>
       </div>
       <div className="flex justify-center p-4 print:block print:p-0">
         <QuotationDocument
           title={quotation.title}
           issuedAt={quotation.issuedAt}
           client={quotation.client}
           lines={quotation.lines.map((line) => ({
             ...line,
+            clientKey: String(line.id),
             imageUrl: line.Image?.location ?? null,
+            thumbnailUrl: line.Image?.thumbnail ?? null,
+          }))}
+          paymentOptions={quotation.paymentOptions.map((option) => ({
+            ...option,
+            clientKey: String(option.id),
           }))}
-          paymentOptions={quotation.paymentOptions}
           notes={quotation.notes}
           rep={rep}
           printMode
         />
       </div>
     </div>
   );
 }
