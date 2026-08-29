import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuotationDocument } from "~/components/admin/QuotationDocument";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME, resolveQuoteRep } from "~/lib/site";
import { getQuotation } from "~/models/quotation.server";
import { waitForPrintReadiness } from "~/utils/print-readiness";
import quotationStyles from "~/styles/quotation-document.css?url";
import { requireAdmin } from "~/utils/require-admin.server";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: quotationStyles }];

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(`Imprimir ${data?.quotation.title ?? "orçamento"} | ${SITE_NAME}`);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { user } = await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw redirect("/admin/quotations");
  const quotation = await getQuotation(id, user.id);
  if (!quotation) throw new Response("Not found", { status: 404 });
  return json({ quotation, rep: resolveQuoteRep(user.email) });
};

export default function QuotationPrint() {
  const { quotation, rep } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const printRequestInFlightRef = useRef(false);
  const autoPrintStartedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startPrint = useCallback(async (mode: "manual" | "autoprint") => {
    if (printRequestInFlightRef.current) return;
    printRequestInFlightRef.current = true;
    setIsPreparingPrint(true);

    try {
      const root = document.querySelector(".quote-stage");
      await waitForPrintReadiness(root);
      if (!isMountedRef.current) return;

      window.print();

      if (mode === "autoprint") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("autoprint")) {
          url.searchParams.delete("autoprint");
          window.history.replaceState({}, "", url);
        }
      }
    } finally {
      printRequestInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsPreparingPrint(false);
      }
    }
  }, []);

  const autoPrintRequested = searchParams.get("autoprint") === "1";
  useEffect(() => {
    if (!autoPrintRequested || autoPrintStartedRef.current) return;
    autoPrintStartedRef.current = true;
    void startPrint("autoprint");
  }, [autoPrintRequested, startPrint]);

  return (
    <div className="quote-print-page min-h-screen bg-zinc-800 print:min-h-0 print:bg-white">
      <div className="no-print flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/quotations/${quotation.id}`}>Voltar ao builder</Link>
        </Button>
        <Button size="sm" onClick={() => void startPrint("manual")} disabled={isPreparingPrint}>
          {isPreparingPrint ? "Preparando..." : "Imprimir / PDF"}
        </Button>
      </div>
      {isPreparingPrint ? (
        <div
          className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 print:hidden"
          role="status"
          aria-live="polite"
        >
          Preparando impressão...
        </div>
      ) : null}
      <div className="flex justify-center p-4 print:block print:p-0">
        <QuotationDocument
          title={quotation.title}
          issuedAt={quotation.issuedAt}
          client={quotation.client}
          lines={quotation.lines.map((line) => ({
            ...line,
            clientKey: String(line.id),
            imageUrl: line.Image?.location ?? null,
            thumbnailUrl: line.Image?.thumbnail ?? line.Image?.location ?? null,
          }))}
          paymentOptions={quotation.paymentOptions.map((option) => ({
            ...option,
            clientKey: String(option.id),
          }))}
          notes={quotation.notes}
          rep={rep}
          printMode
        />
      </div>
    </div>
  );
}
