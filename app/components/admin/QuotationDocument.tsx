import { memo } from "react";
import type { QuotationLine, QuotationPaymentOption, QuoteClient } from "@prisma/client";

import { formatBRL, quotationTotalCents, splitNoteLines } from "~/utils/quotation";
import { formatTaxId, taxIdLabel } from "~/utils/tax-id";
import { QUOTE_COMPANY, type QuoteRepProfile } from "~/lib/site";

type QuotationDocumentProps = {
  title: string;
  issuedAt: Date | string;
  client: Pick<QuoteClient, "name" | "location" | "document">;
  lines: Array<
    Pick<QuotationLine, "name" | "quantity" | "descriptionLines" | "unitPriceCents"> & {
      clientKey?: string;
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
    }
  >;
  paymentOptions: Array<Pick<QuotationPaymentOption, "label" | "amountCents" | "detail"> & { clientKey?: string }>;
  notes: string | null;
  rep: QuoteRepProfile;
  /** Dedicated print page: no screen chrome, print stylesheet applies. */
  printMode?: boolean;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function formatDateBR(value: Date | string) {
  const d = asDate(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function descLines(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) return [raw];
  return [];
}

export const QuotationDocument = memo(function QuotationDocument({
  title,
  issuedAt,
  client,
  lines,
  paymentOptions,
  notes,
  rep,
  printMode,
}: QuotationDocumentProps) {
  const total = quotationTotalCents(lines);
  const year = asDate(issuedAt).getFullYear();
  const noteItems = splitNoteLines(notes);

  return (
    <div
      className={
        printMode
          ? "quote-stage quote-stage--print mx-auto"
          : "quote-stage mx-auto shadow-sm print:shadow-none"
      }
    >
      <img className="quote-stage__bg" src="/quote-building-bg.webp" alt="" aria-hidden />
      <div className="quote-doc__logo" aria-label={QUOTE_COMPANY.legalName}>
        <img src="/quote-logo.webp" alt={QUOTE_COMPANY.legalName} width={160} height={160} />
        <span className="quote-doc__logo-person">{rep.brandPerson}</span>
      </div>
      <article className="quote-doc text-ink">
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
              <dd className="quote-doc__client-name">{client.name || title}</dd>
            </div>
            {client.location ? (
              <div>
                <dt>Local</dt>
                <dd>{client.location}</dd>
              </div>
            ) : null}
            {client.document ? (
              <div>
                <dt>{taxIdLabel(client.document)}</dt>
                <dd>{formatTaxId(client.document)}</dd>
              </div>
            ) : null}
          </dl>
        </header>

      <div className="quote-doc__table-head" role="row">
        <span>Item</span>
        <span>Qtd.</span>
        <span>Descrição</span>
      </div>

      <ol className="quote-doc__lines">
        {lines.map((line, index) => {
          const bullets = descLines(line.descriptionLines);
          const lineTotal = line.quantity * line.unitPriceCents;
          const imageSrc = printMode
            ? line.imageUrl ?? line.thumbnailUrl
            : line.thumbnailUrl ?? line.imageUrl;
          const hasPhoto = Boolean(imageSrc);
          return (
            <li key={line.clientKey ?? `${line.name}-${line.quantity}-${line.unitPriceCents}`} className="quote-doc__line">
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
                  {hasPhoto ? <img className="quote-doc__line-photo" src={imageSrc ?? ""} alt="" /> : null}
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
      </ol>

      <section className="quote-doc__summary">
        <div className="quote-doc__total">
          <span className="quote-doc__total-label">Valor total:</span>
          <strong className="quote-doc__total-value">{formatBRL(total)}</strong>
        </div>
        {noteItems.length > 0 ? (
          <ul className="quote-doc__notes">
            {noteItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {paymentOptions.length > 0 ? (
        <section className="quote-doc__payments">
          <h2>formas de pagamento</h2>
          <ul>
            {paymentOptions.map((opt) => (
              <li key={opt.clientKey ?? `${opt.label}-${opt.amountCents}`}>
                <span className="quote-doc__pay-label">{opt.label}</span>
                <span className="quote-doc__pay-amount">{formatBRL(opt.amountCents)}</span>
                {opt.detail ? <span className="quote-doc__pay-detail">{opt.detail}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      </article>

      <footer className="quote-doc__footer">
        Contato: {rep.phone} | {rep.city} | {rep.email} | {year}
      </footer>
    </div>
  );
});
