import { memo, useCallback, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { flushSync } from "react-dom";

import { calendarDayYear, formatCalendarDayShort } from "~/lib/calendar-day";
import { formatBRL } from "~/lib/money";
import { splitBulletText } from "~/lib/text-lines";
import { useIsomorphicLayoutEffect } from "~/lib/use-isomorphic-layout-effect";
import { formatClientAddress, formatPhone } from "~/admin/clients/client-display";
import type { ClientContent } from "~/admin/clients/client-form";
import { formatTaxId, taxIdLabel } from "~/admin/clients/tax-id";

import { ISSUING_COMPANY, type SalesRep } from "../issuer";
import { lineTotalCents, quotationTotalCents } from "../quotation-content";
import { buildDocumentBlocks, paginateDocumentBlocks, type DocumentBlock } from "./document-pages";

export type DocumentClient = Pick<
  ClientContent,
  "name" | "taxId" | "phone" | "street" | "number" | "complement" | "district" | "city" | "state"
>;

export type DocumentLine = {
  /** Stable React key: the saved line id, or the editor draft key. */
  rowKey: string;
  name: string;
  quantity: number;
  descriptionLines: string[];
  unitPriceCents: number;
  imageUrl: string | null;
  thumbnailUrl: string | null;
};

export type DocumentPaymentOption = { rowKey: string; label: string; amountCents: number; detail: string | null };

export type QuotationDocumentProps = {
  issuedAt: Date | string;
  client: DocumentClient;
  lines: DocumentLine[];
  paymentOptions: DocumentPaymentOption[];
  notes: string | null;
  salesRep: SalesRep;
  /** The print page: full-size images and no sheet shadow. */
  printMode?: boolean;
};

// Measured heights are sub-pixel; this margin keeps a full page from spilling onto a blank sheet.
const PAGE_FIT_SLACK_PX = 2;

function outerHeight(element: Element) {
  const style = getComputedStyle(element);
  return element.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
}

function sameSizes(a: number[], b: number[]) {
  return a.length === b.length && a.every((size, i) => size === b[i]);
}

type Fit = { scale: number; height: number };

/** Scales the A4 sheets down to the frame's width on screen. Print ignores it: see the stylesheet. */
function useFitToWidth(frameRef: RefObject<HTMLElement>, sheetsRef: RefObject<HTMLElement>) {
  const [fit, setFit] = useState<Fit | null>(null);

  useIsomorphicLayoutEffect(() => {
    const frame = frameRef.current;
    const sheets = sheetsRef.current;
    if (!frame || !sheets) return;
    const update = () => {
      // offsetWidth and offsetHeight are layout sizes, so the transform on the sheets does not change them.
      const scale = Math.min(1, frame.getBoundingClientRect().width / sheets.offsetWidth);
      const height = sheets.offsetHeight * scale;
      setFit((prev) => (prev?.scale === scale && prev.height === height ? prev : { scale, height }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(sheets);
    update();
    return () => observer.disconnect();
  }, [frameRef, sheetsRef]);

  return fit;
}

function fitStyle(fit: Fit | null): CSSProperties | undefined {
  if (!fit) return undefined;
  return { "--quotation-scale": fit.scale, "--quotation-fitted-height": `${fit.height}px` } as CSSProperties;
}

function splitPages(blocks: DocumentBlock[], sizes: number[]) {
  // Sizes lag one render behind a change in block count; show one page until remeasured.
  if (sizes.reduce((sum, size) => sum + size, 0) !== blocks.length) return [blocks];
  let start = 0;
  return sizes.map((size) => blocks.slice(start, (start += size)));
}

export const QuotationDocument = memo(function QuotationDocument(props: QuotationDocumentProps) {
  const { lines, paymentOptions } = props;
  const blocks = useMemo(
    () => buildDocumentBlocks(lines.length, paymentOptions.length),
    [lines.length, paymentOptions.length],
  );
  const [pageSizes, setPageSizes] = useState<number[]>([blocks.length]);
  const measureRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetsRef = useRef<HTMLDivElement>(null);
  const fit = useFitToWidth(frameRef, sheetsRef);

  const measure = useCallback(() => {
    const root = measureRef.current;
    const firstBody = root?.querySelector('[data-measure="first"] .quotation-doc__body');
    const restBody = root?.querySelector('[data-measure="rest"] .quotation-doc__body');
    const tableHead = firstBody?.querySelector(".quotation-doc__table-head");
    // Zero height means the measurer is not laid out, e.g. under print media.
    if (!firstBody || !restBody || !tableHead || firstBody.clientHeight === 0) return;

    const heights = Array.from(firstBody.querySelectorAll("[data-block]"), outerHeight);
    const pages = paginateDocumentBlocks(blocks, heights, {
      firstCapacity: firstBody.clientHeight - PAGE_FIT_SLACK_PX,
      restCapacity: restBody.clientHeight - PAGE_FIT_SLACK_PX,
      tableHead: outerHeight(tableHead),
    });
    const next = pages.map((page) => page.length);
    setPageSizes((prev) => (sameSizes(prev, next) ? prev : next));
  }, [blocks]);

  // Content changes arrive as renders, so remeasure after each one.
  useIsomorphicLayoutEffect(measure);

  useIsomorphicLayoutEffect(() => {
    const body = measureRef.current?.querySelector('[data-measure="first"] .quotation-doc__body');
    if (!body) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(body);
    let active = true;
    // Web fonts change text metrics; flush so a pending print sees the final pages.
    void document.fonts?.ready.then(() => active && flushSync(measure));
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [measure]);

  const pages = splitPages(blocks, pageSizes);

  return (
    <div ref={frameRef} className="quotation-pages" style={fitStyle(fit)}>
      <div ref={sheetsRef} className="quotation-sheets">
        {pages.map((page, index) => (
          <DocumentPage key={index} {...props} blocks={page} pageIndex={index} pageCount={pages.length} />
        ))}
      </div>
      {/* Offscreen copy of a first and a later page, laid out at the real page width. */}
      <div ref={measureRef} className="quotation-measure" aria-hidden>
        <DocumentPage {...props} blocks={blocks} pageIndex={0} pageCount={2} measure="first" />
        <DocumentPage {...props} blocks={[]} pageIndex={1} pageCount={2} measure="rest" />
      </div>
    </div>
  );
});

type DocumentPageProps = QuotationDocumentProps & {
  blocks: DocumentBlock[];
  pageIndex: number;
  pageCount: number;
  measure?: "first" | "rest";
};

type PageContents = {
  lineIndexes: number[];
  paymentOptionIndexes: number[];
  hasSummary: boolean;
  hasPaymentOptionsHeading: boolean;
};

function pageContents(blocks: DocumentBlock[]): PageContents {
  const contents: PageContents = { lineIndexes: [], paymentOptionIndexes: [], hasSummary: false, hasPaymentOptionsHeading: false };
  for (const block of blocks) {
    if (block.kind === "line") contents.lineIndexes.push(block.index);
    else if (block.kind === "payment-option") contents.paymentOptionIndexes.push(block.index);
    else if (block.kind === "summary") contents.hasSummary = true;
    else contents.hasPaymentOptionsHeading = true;
  }
  return contents;
}

function DocumentPage({ blocks, pageIndex, pageCount, measure, ...doc }: DocumentPageProps) {
  const { issuedAt, client, lines, paymentOptions, notes, salesRep, printMode } = doc;
  const isFirst = pageIndex === 0;
  const contents = pageContents(blocks);
  const stageClass = [
    "quotation-stage quotation-page",
    printMode ? "" : "shadow-sm print:shadow-none",
    measure ? "quotation-page--measure" : "",
  ].join(" ");

  return (
    <section className={stageClass} data-measure={measure}>
      <img className="quotation-stage__bg" src="/quotation-building-bg.webp" alt="" aria-hidden />
      {isFirst ? <DocumentLogo salesRep={salesRep} /> : null}
      <article className="quotation-doc text-ink">
        {isFirst ? <FirstPageHeader issuedAt={issuedAt} client={client} /> : <LaterPageHeader issuedAt={issuedAt} client={client} />}

        <div className="quotation-doc__body">
          {/* The measurer's first page always shows the table head, so its height can be read. */}
          <LinesTable lines={lines} indexes={contents.lineIndexes} printMode={printMode} alwaysShowHead={measure === "first"} />
          {contents.hasSummary ? <DocumentSummary lines={lines} notes={notes} /> : null}
          <PaymentOptionsSection
            withHeading={contents.hasPaymentOptionsHeading}
            options={contents.paymentOptionIndexes.map((index) => paymentOptions[index])}
          />
        </div>
      </article>

      <footer className="quotation-doc__footer">
        Contato: {salesRep.phone} | {salesRep.city} | {salesRep.email} | {calendarDayYear(issuedAt)}
        {pageCount > 1 ? ` | Página ${pageIndex + 1} de ${pageCount}` : null}
      </footer>
    </section>
  );
}

function DocumentLogo({ salesRep }: { salesRep: SalesRep }) {
  return (
    <div className="quotation-doc__logo" aria-label={ISSUING_COMPANY.legalName}>
      <img src="/quotation-logo.webp" alt={ISSUING_COMPANY.legalName} width={160} height={160} />
      <span className="quotation-doc__logo-person">{salesRep.name}</span>
    </div>
  );
}

type HeaderProps = Pick<QuotationDocumentProps, "issuedAt" | "client">;

function FirstPageHeader({ issuedAt, client }: HeaderProps) {
  return (
    <header className="quotation-doc__header">
      <div className="quotation-doc__header-top">
        <h1 className="quotation-doc__title">Orçamento</h1>
        <IssueDate issuedAt={issuedAt} />
      </div>
      <p className="quotation-doc__company">{ISSUING_COMPANY.legalName}</p>
      <p className="quotation-doc__tax">
        {ISSUING_COMPANY.taxRegime}, {ISSUING_COMPANY.cnpj}
      </p>
      <dl className="quotation-doc__client">
        <ClientDetail term="Cliente" className="quotation-doc__client-name" value={client.name} />
        <ClientDetail term="Local" value={formatClientAddress(client)} />
        {client.taxId ? <ClientDetail term={taxIdLabel(client.taxId)} value={formatTaxId(client.taxId)} /> : null}
        {client.phone ? <ClientDetail term="Telefone" value={formatPhone(client.phone)} /> : null}
      </dl>
    </header>
  );
}

function ClientDetail({ term, value, className }: { term: string; value: string; className?: string }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd className={className}>{value}</dd>
    </div>
  );
}

function LaterPageHeader({ issuedAt, client }: HeaderProps) {
  return (
    <header className="quotation-doc__header quotation-doc__header--compact">
      <img className="quotation-doc__mini-logo" src="/quotation-logo.webp" alt="" width={48} height={48} />
      <div className="quotation-doc__compact-id">
        <p className="quotation-doc__company">{ISSUING_COMPANY.legalName}</p>
        <p className="quotation-doc__compact-client">Orçamento · {client.name}</p>
      </div>
      <IssueDate issuedAt={issuedAt} />
    </header>
  );
}

function IssueDate({ issuedAt }: { issuedAt: Date | string }) {
  return (
    <div className="quotation-doc__date">
      <span>Data</span>
      <strong>{formatCalendarDayShort(issuedAt)}</strong>
    </div>
  );
}

type LinesTableProps = {
  lines: DocumentLine[];
  /** The indexes of the lines this page holds. */
  indexes: number[];
  printMode?: boolean;
  alwaysShowHead: boolean;
};

function LinesTable({ lines, indexes, printMode, alwaysShowHead }: LinesTableProps) {
  const hasLines = indexes.length > 0;
  return (
    <>
      {hasLines || alwaysShowHead ? (
        <div className="quotation-doc__table-head" role="row">
          <span>Item</span>
          <span>Qtd.</span>
          <span>Descrição</span>
        </div>
      ) : null}
      {hasLines ? (
        <ol className="quotation-doc__lines" start={indexes[0] + 1}>
          {indexes.map((index) => (
            <DocumentLineItem key={lines[index].rowKey} line={lines[index]} index={index} printMode={printMode} />
          ))}
        </ol>
      ) : null}
    </>
  );
}

type DocumentLineItemProps = {
  line: DocumentLine;
  index: number;
  printMode?: boolean;
};

function DocumentLineItem({ line, index, printMode }: DocumentLineItemProps) {
  const lineTotal = lineTotalCents(line);
  // Print needs the full image; the screen preview loads the thumbnail.
  const imageSrc = printMode ? line.imageUrl ?? line.thumbnailUrl : line.thumbnailUrl ?? line.imageUrl;
  return (
    <li className="quotation-doc__line" data-block>
      <div className="quotation-doc__line-main">
        <span className="quotation-doc__line-num">{index + 1}</span>
        <div className={imageSrc ? "quotation-doc__line-body" : "quotation-doc__line-body quotation-doc__line-body--no-photo"}>
          <p className="quotation-doc__line-name">{line.name}</p>
          <span className="quotation-doc__line-qty">{line.quantity}</span>
          {line.descriptionLines.length > 0 ? (
            <ul className="quotation-doc__line-desc">
              {line.descriptionLines.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : (
            <span className="quotation-doc__line-desc-empty" />
          )}
          {imageSrc ? <img className="quotation-doc__line-photo" src={imageSrc} alt="" /> : null}
        </div>
      </div>
      {lineTotal > 0 ? (
        <p className="quotation-doc__line-price">
          Valor: <strong>{formatBRL(lineTotal)}</strong>
        </p>
      ) : null}
    </li>
  );
}

function DocumentSummary({ lines, notes }: Pick<QuotationDocumentProps, "lines" | "notes">) {
  const noteItems = splitBulletText(notes);
  return (
    <section className="quotation-doc__summary" data-block>
      <div className="quotation-doc__total">
        <span className="quotation-doc__total-label">Valor total:</span>
        <strong className="quotation-doc__total-value">{formatBRL(quotationTotalCents(lines))}</strong>
      </div>
      {noteItems.length > 0 ? (
        <ul className="quotation-doc__notes">
          {noteItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function PaymentOptionsSection({ withHeading, options }: { withHeading: boolean; options: DocumentPaymentOption[] }) {
  if (!withHeading && options.length === 0) return null;
  return (
    <section className="quotation-doc__payments">
      {withHeading ? <h2 data-block>formas de pagamento</h2> : null}
      <ul>
        {options.map((option) => (
          <li key={option.rowKey} data-block>
            <span className="quotation-doc__payment-label">{option.label}</span>
            <span className="quotation-doc__payment-amount">{formatBRL(option.amountCents)}</span>
            {option.detail ? <span className="quotation-doc__payment-detail">{option.detail}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
