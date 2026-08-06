import type { QuotationLine, QuotationPaymentOption, QuoteClient } from "@prisma/client";

import { formatBRL, quotationTotalCents } from "~/models/quotation.server";
import { QUOTE_COMPANY } from "~/lib/site";

type QuotationDocumentProps = {
  title: string;
  issuedAt: Date | string;
  client: Pick<QuoteClient, "name" | "location" | "document">;
  lines: Array<Pick<QuotationLine, "name" | "quantity" | "descriptionLines" | "unitPriceCents">>;
  paymentOptions: Array<Pick<QuotationPaymentOption, "label" | "amountCents" | "detail">>;
  notes: string | null;
  /** When true, hide on-screen chrome (print stylesheet still applies). */
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

export function QuotationDocument({
  title,
  issuedAt,
  client,
  lines,
  paymentOptions,
  notes,
}: QuotationDocumentProps) {
  const total = quotationTotalCents(lines);
  const year = asDate(issuedAt).getFullYear();

  return (
    <article className="quote-doc mx-auto bg-white text-ink shadow-sm print:shadow-none">
      <header className="quote-doc__header">
        <div className="quote-doc__header-left">
          <h1 className="quote-doc__title">Orçamento</h1>
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
                <dt>CPF</dt>
                <dd>{client.document}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="quote-doc__header-right">
          <div className="quote-doc__date">
            <span>Data</span>
            <strong>{formatDateBR(issuedAt)}</strong>
          </div>
          <div className="quote-doc__logo" aria-label={QUOTE_COMPANY.legalName}>
            <span className="quote-doc__logo-mark" aria-hidden>
              ▲
            </span>
            <span className="quote-doc__logo-brand">Thermal</span>
            <span className="quote-doc__logo-person">{QUOTE_COMPANY.brandPerson}</span>
          </div>
        </div>
      </header>

      <div className="quote-doc__table-head" role="row">
        <span>Item</span>
        <span>Qtd.</span>
        <span>Descrição</span>
      </div>

      <ol className="quote-doc__lines">
        {lines.map((line, index) => {
          const bullets = descLines(line.descriptionLines);
          return (
            <li key={`${line.name}-${index}`} className="quote-doc__line">
              <div className="quote-doc__line-main">
                <span className="quote-doc__line-num">{index + 1}</span>
                <div className="quote-doc__line-body">
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
                  <div className="quote-doc__line-photo" aria-hidden />
                </div>
              </div>
              <p className="quote-doc__line-price">
                Valor: <strong>{formatBRL(line.quantity * line.unitPriceCents)}</strong>
              </p>
            </li>
          );
        })}
      </ol>

      <section className="quote-doc__summary">
        <div className="quote-doc__total">
          <span className="quote-doc__total-label">Valor total:</span>
          <strong className="quote-doc__total-value">{formatBRL(total)}</strong>
        </div>
        {notes ? <p className="quote-doc__notes">{notes}</p> : null}
      </section>

      {paymentOptions.length > 0 ? (
        <section className="quote-doc__payments">
          <h2>formas de pagamento</h2>
          <ul>
            {paymentOptions.map((opt, i) => (
              <li key={`${opt.label}-${i}`}>
                <span className="quote-doc__pay-label">{opt.label}</span>
                <span className="quote-doc__pay-amount">{formatBRL(opt.amountCents)}</span>
                {opt.detail ? <span className="quote-doc__pay-detail">{opt.detail}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="quote-doc__footer">
        Contato: {QUOTE_COMPANY.footerPhone} | {QUOTE_COMPANY.footerCity}, {year}
      </footer>
    </article>
  );
}
