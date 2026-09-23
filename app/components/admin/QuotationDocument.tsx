import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { formatClientAddress, formatPhone, type ClientInput } from "~/utils/client";
import { formatBRL, quotationTotalCents, splitNoteLines } from "~/utils/quotation";
import { buildQuoteBlocks, paginateQuoteBlocks, type QuoteBlock } from "~/utils/quotation-pages";
import { formatTaxId, taxIdLabel } from "~/utils/tax-id";
import { QUOTE_COMPANY, type QuoteRepProfile } from "~/lib/site";

export type QuotationDocumentClient = Pick<
  ClientInput,
  "name" | "document" | "phone" | "street" | "number" | "complement" | "district" | "city" | "state"
>;

type QuotationDocumentProps = {
  issuedAt: Date | string;
  client: QuotationDocumentClient;
  lines: Array<{
    name: string;
    quantity: number;
    descriptionLines: unknown;
    unitPriceCents: number;
    clientKey?: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  }>;
  paymentOptions: Array<{ label: string; amountCents: number; detail: string | null; clientKey?: string }>;
  notes: string | null;
  rep: QuoteRepProfile;
  /** Dedicated print page: no screen chrome, print stylesheet applies. */
  printMode?: boolean;
};

// Measured heights are sub-pixel; this margin keeps a full page from spilling onto a blank sheet.
const PAGE_FIT_SLACK_PX = 2;

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/** The issue date is a calendar day stored at UTC midnight, so read it in UTC. */
function formatDateBR(value: Date | string) {
  const d = asDate(value);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function descLines(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) return [raw];
  return [];
}

function outerHeight(element: Element) {
  const style = getComputedStyle(element);
  return element.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
}

function sameSizes(a: number[], b: number[]) {
  return a.length === b.length && a.every((size, i) => size === b[i]);
}

function splitPages(blocks: QuoteBlock[], sizes: number[]) {
  // Sizes lag one render behind a change in block count; show one page until remeasured.
  if (sizes.reduce((sum, size) => sum + size, 0) !== blocks.length) return [blocks];
  let start = 0;
  return sizes.map((size) => blocks.slice(start, (start += size)));
}

export const QuotationDocument = memo(function QuotationDocument(props: QuotationDocumentProps) {
  const { lines, paymentOptions } = props;
  const blocks = useMemo(
    () => buildQuoteBlocks(lines.length, paymentOptions.length),
    [lines.length, paymentOptions.length],
  );
  const [pageSizes, setPageSizes] = useState<number[]>([blocks.length]);
  const measureRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const root = measureRef.current;
    const firstBody = root?.querySelector('[data-measure="first"] .quote-doc__body');
    const restBody = root?.querySelector('[data-measure="rest"] .quote-doc__body');
    const tableHead = firstBody?.querySelector(".quote-doc__table-head");
    // Zero height means the measurer is not laid out, e.g. under print media.
    if (!firstBody || !restBody || !tableHead || firstBody.clientHeight === 0) return;

    const heights = Array.from(firstBody.querySelectorAll("[data-block]"), outerHeight);
    const pages = paginateQuoteBlocks(blocks, heights, {
      firstCapacity: firstBody.clientHeight - PAGE_FIT_SLACK_PX,
      restCapacity: restBody.clientHeight - PAGE_FIT_SLACK_PX,
      tableHead: outerHeight(tableHead),
    });
    const next = pages.map((page) => page.length);
    setPageSizes((prev) => (sameSizes(prev, next) ? prev : next));
  }, [blocks]);

  // Content changes arrive as renders, so remeasure after each one.
  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const body = measureRef.current?.querySelector('[data-measure="first"] .quote-doc__body');
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
    <div className="quote-pages">
      {pages.map((page, index) => (
        <QuotePage key={index} {...props} blocks={page} pageIndex={index} pageCount={pages.length} />
      ))}
      {/* Offscreen copy of a first and a later page, laid out at the real page width. */}
      <div ref={measureRef} className="quote-measure" aria-hidden>
        <QuotePage {...props} blocks={blocks} pageIndex={0} pageCount={2} measure="first" />
        <QuotePage {...props} blocks={[]} pageIndex={1} pageCount={2} measure="rest" />
      </div>
    </div>
  );
});

type QuotePageProps = QuotationDocumentProps & {
  blocks: QuoteBlock[];
  pageIndex: number;
  pageCount: number;
  measure?: "first" | "rest";
};

function QuotePage({ blocks, pageIndex, pageCount, measure, ...doc }: QuotePageProps) {
  const { issuedAt, client, lines, paymentOptions, notes, rep, printMode } = doc;
  const isFirst = pageIndex === 0;
  const pageLines = blocks.flatMap((b) => (b.kind === "line" ? [b.index] : []));
  const pagePayments = blocks.flatMap((b) => (b.kind === "payment" ? [b.index] : []));
  const hasSummary = blocks.some((b) => b.kind === "summary");
  const hasPaymentsHead = blocks.some((b) => b.kind === "payments-head");
  // The measurer's first page always shows the table head, so its height can be read.
  const showTableHead = pageLines.length > 0 || measure === "first";
  const stageClass = [
    "quote-stage quote-page mx-auto",
    printMode ? "quote-stage--print" : "shadow-sm print:shadow-none",
    measure ? "quote-page--measure" : "",
  ].join(" ");

  return (
    <section className={stageClass} data-measure={measure}>
      <img className="quote-stage__bg" src="/quote-building-bg.webp" alt="" aria-hidden />
      {isFirst ? (
        <div className="quote-doc__logo" aria-label={QUOTE_COMPANY.legalName}>
          <img src="/quote-logo.webp" alt={QUOTE_COMPANY.legalName} width={160} height={160} />
          <span className="quote-doc__logo-person">{rep.brandPerson}</span>
        </div>
      ) : null}
      <article className="quote-doc text-ink">
        {isFirst ? <FullHeader issuedAt={issuedAt} client={client} /> : <CompactHeader issuedAt={issuedAt} client={client} />}

        <div className="quote-doc__body">
          {showTableHead ? (
            <div className="quote-doc__table-head" role="row">
              <span>Item</span>
              <span>Qtd.</span>
              <span>Descrição</span>
            </div>
          ) : null}

          {pageLines.length > 0 ? (
            <ol className="quote-doc__lines" start={pageLines[0] + 1}>
              {pageLines.map((index) => (
                <QuoteLineItem key={lines[index].clientKey ?? index} line={lines[index]} index={index} printMode={printMode} />
              ))}
            </ol>
          ) : null}

          {hasSummary ? <QuoteSummary lines={lines} notes={notes} /> : null}

          {hasPaymentsHead || pagePayments.length > 0 ? (
            <section className="quote-doc__payments">
              {hasPaymentsHead ? <h2 data-block>formas de pagamento</h2> : null}
              <ul>
                {pagePayments.map((index) => {
                  const opt = paymentOptions[index];
                  return (
                    <li key={opt.clientKey ?? index} data-block>
                      <span className="quote-doc__pay-label">{opt.label}</span>
                      <span className="quote-doc__pay-amount">{formatBRL(opt.amountCents)}</span>
                      {opt.detail ? <span className="quote-doc__pay-detail">{opt.detail}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </article>

      <footer className="quote-doc__footer">
        Contato: {rep.phone} | {rep.city} | {rep.email} | {asDate(issuedAt).getUTCFullYear()}
        {pageCount > 1 ? ` | Página ${pageIndex + 1} de ${pageCount}` : null}
      </footer>
    </section>
  );
}

type HeaderProps = Pick<QuotationDocumentProps, "issuedAt" | "client">;

function FullHeader({ issuedAt, client }: HeaderProps) {
  return (
    <header className="quote-doc__header">
      <div className="quote-doc__header-top">
        <h1 className="quote-doc__title">Orçamento</h1>
        <div className="quote-doc__date">
          <span>Data</span>
          <strong>{formatDateBR(issuedAt)}</strong>
        </div>
      </div>
      <p className="quote-doc__company">{QUOTE_COMPANY.legalName}</p>
      <p className="quote-doc__tax">
        {QUOTE_COMPANY.taxRegime}, {QUOTE_COMPANY.cnpj}
      </p>
      <dl className="quote-doc__client">
        <div>
          <dt>Cliente</dt>
          <dd className="quote-doc__client-name">{client.name}</dd>
        </div>
        <div>
          <dt>Local</dt>
          <dd>{formatClientAddress(client)}</dd>
        </div>
        {client.document ? (
          <div>
            <dt>{taxIdLabel(client.document)}</dt>
            <dd>{formatTaxId(client.document)}</dd>
          </div>
        ) : null}
        {client.phone ? (
          <div>
            <dt>Telefone</dt>
            <dd>{formatPhone(client.phone)}</dd>
          </div>
        ) : null}
      </dl>
    </header>
  );
}

function CompactHeader({ issuedAt, client }: HeaderProps) {
  return (
    <header className="quote-doc__header quote-doc__header--compact">
      <img className="quote-doc__mini-logo" src="/quote-logo.webp" alt="" width={48} height={48} />
      <div className="quote-doc__compact-id">
        <p className="quote-doc__company">{QUOTE_COMPANY.legalName}</p>
        <p className="quote-doc__compact-client">Orçamento · {client.name}</p>
      </div>
      <div className="quote-doc__date">
        <span>Data</span>
        <strong>{formatDateBR(issuedAt)}</strong>
      </div>
    </header>
  );
}

type LineProps = {
  line: QuotationDocumentProps["lines"][number];
  index: number;
  printMode?: boolean;
};

function QuoteLineItem({ line, index, printMode }: LineProps) {
  const bullets = descLines(line.descriptionLines);
  const lineTotal = line.quantity * line.unitPriceCents;
  const imageSrc = printMode ? line.imageUrl ?? line.thumbnailUrl : line.thumbnailUrl ?? line.imageUrl;
  return (
    <li className="quote-doc__line" data-block>
      <div className="quote-doc__line-main">
        <span className="quote-doc__line-num">{index + 1}</span>
        <div className={imageSrc ? "quote-doc__line-body" : "quote-doc__line-body quote-doc__line-body--no-photo"}>
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
          {imageSrc ? <img className="quote-doc__line-photo" src={imageSrc} alt="" /> : null}
        </div>
      </div>
      {lineTotal > 0 ? (
        <p className="quote-doc__line-price">
          Valor: <strong>{formatBRL(lineTotal)}</strong>
        </p>
      ) : null}
    </li>
  );
}

function QuoteSummary({ lines, notes }: Pick<QuotationDocumentProps, "lines" | "notes">) {
  const noteItems = splitNoteLines(notes);
  return (
    <section className="quote-doc__summary" data-block>
      <div className="quote-doc__total">
        <span className="quote-doc__total-label">Valor total:</span>
        <strong className="quote-doc__total-value">{formatBRL(quotationTotalCents(lines))}</strong>
      </div>
      {noteItems.length > 0 ? (
        <ul className="quote-doc__notes">
          {noteItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
