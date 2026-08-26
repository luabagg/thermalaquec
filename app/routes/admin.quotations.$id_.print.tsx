import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useEffect } from "react";
import { QuotationDocument } from "~/components/admin/QuotationDocument";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME, resolveQuoteRep } from "~/lib/site";
import { getQuotation } from "~/models/quotation.server";
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

function waitForImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

async function waitForPrintReady(root: ParentNode | null) {
  if (root) await waitForImages(root);
  if (document.fonts?.ready) await document.fonts.ready;
}

export default function QuotationPrint() {
  const { quotation, rep } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("autoprint") !== "1") return;
    let cancelled = false;
    const root = document.querySelector(".quote-stage");
    void (async () => {
      await waitForPrintReady(root);
      if (cancelled) return;
      window.print();
      const url = new URL(window.location.href);
      if (url.searchParams.has("autoprint")) {
        url.searchParams.delete("autoprint");
        window.history.replaceState({}, "", url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="quote-print-page min-h-screen bg-zinc-800 print:min-h-0 print:bg-white">
      <div className="no-print flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/quotations/${quotation.id}`}>Voltar ao builder</Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
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
            imageUrl: line.Image?.location ?? null,
          }))}
          paymentOptions={quotation.paymentOptions}
          notes={quotation.notes}
          rep={rep}
          printMode
        />
      </div>
    </div>
  );
}
