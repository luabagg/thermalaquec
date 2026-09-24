import { memo, useDeferredValue } from "react";

import { QuotationDocument, type QuotationDocumentProps } from "../document/QuotationDocument";

/** The editor's live document. React renders it at low priority, so typing stays responsive. */
export const QuotationPreview = memo(function QuotationPreview(props: Omit<QuotationDocumentProps, "printMode">) {
  const preview = useDeferredValue(props);
  return <QuotationDocument {...preview} />;
});
