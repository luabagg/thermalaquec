import { memo, useDeferredValue } from "react";

import { QuotationDocument } from "~/components/admin/QuotationDocument";
import type { QuoteRepProfile } from "~/lib/site";

export type QuotationPreviewProps = {
  title: string;
  issuedAt: string;
  client: {
    name: string;
    location: string | null;
    document: string | null;
  };
  lines: Array<{
    clientKey: string;
    name: string;
    quantity: number;
    descriptionLines: string[];
    unitPriceCents: number;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  }>;
  paymentOptions: Array<{
    clientKey: string;
    label: string;
    amountCents: number;
    detail: string | null;
  }>;
  notes: string | null;
  rep: QuoteRepProfile;
};

export const QuotationPreview = memo(function QuotationPreview(props: QuotationPreviewProps) {
  const preview = useDeferredValue(props);

  return (
    <QuotationDocument
      title={preview.title}
      issuedAt={preview.issuedAt}
      client={preview.client}
      lines={preview.lines}
      paymentOptions={preview.paymentOptions}
      notes={preview.notes}
      rep={preview.rep}
    />
  );
});
