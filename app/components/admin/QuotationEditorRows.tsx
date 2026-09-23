import { memo, useState } from "react";
import { Button } from "~/components/ui/button";
import { FileButton } from "~/components/ui/file-button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatBRL } from "~/utils/quotation";
import { ChevronDown, Trash2 } from "lucide-react";

export type QuotationEditorLine = {
  clientKey: string;
  name: string;
  quantity: number;
  description: string;
  priceInput: string;
  unitPriceCents: number;
  catalogVariantId: number | null;
  imageId: number | null;
  imageUrl: string | null;
  imageThumbnail: string | null;
  /** Only a line typed by hand starts open; saved and catalog lines start closed. */
  openOnMount: boolean;
};

export type QuotationEditorPayment = {
  clientKey: string;
  label: string;
  amountInput: string;
  amountCents: number;
  detail: string;
};

type QuotationEditorLineRowProps = {
  line: QuotationEditorLine;
  index: number;
  busy: boolean;
  lineUploading: boolean;
  uploadError?: string;
  onRemove(clientKey: string): void;
  onChange(clientKey: string, patch: Partial<QuotationEditorLine>): void;
  onUpload(clientKey: string, file: File): void;
};

export const QuotationEditorLineRow = memo(function QuotationEditorLineRow({
  line,
  index,
  busy,
  lineUploading,
  uploadError,
  onRemove,
  onChange,
  onUpload,
}: QuotationEditorLineRowProps) {
  const imageSrc = line.imageThumbnail ?? line.imageUrl;
  const lineTotal = line.quantity * line.unitPriceCents;
  // Read once: the row must not collapse while the user types.
  const [initiallyOpen] = useState(line.openOnMount);

  return (
    <details
      open={initiallyOpen}
      // Closed fields still submit; open the row so the browser can show a validation error.
      onInvalidCapture={(e) => (e.currentTarget.open = true)}
      className="group border border-border"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        <span className="text-xs text-muted-foreground">#{index + 1}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{line.name || "Sem nome"}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {line.quantity}× {lineTotal > 0 ? formatBRL(lineTotal) : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            onRemove(line.clientKey);
          }}
          aria-label="Remover item"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remover</span>
        </Button>
      </summary>
      <div className="space-y-2 px-3 pb-3">
        <input type="hidden" name={`line.${index}.catalogVariantId`} value={line.catalogVariantId ?? ""} />
        <input type="hidden" name={`line.${index}.imageId`} value={line.imageId ?? ""} />
        <Input
          name={`line.${index}.name`}
          value={line.name}
          onChange={(e) => onChange(line.clientKey, { name: e.target.value })}
          placeholder="Item"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            name={`line.${index}.quantity`}
            type="number"
            min={1}
            value={line.quantity}
            onChange={(e) =>
              onChange(line.clientKey, {
                quantity: Math.max(1, Number(e.target.value) || 1),
              })
            }
            placeholder="Qtd"
          />
          <Input
            name={`line.${index}.price`}
            value={line.priceInput}
            onChange={(e) => onChange(line.clientKey, { priceInput: e.target.value })}
            placeholder="Preço unit."
          />
        </div>
        <textarea
          name={`line.${index}.description`}
          rows={3}
          value={line.description}
          onChange={(e) => onChange(line.clientKey, { description: e.target.value })}
          placeholder="Descrição (uma linha por bullet)"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {imageSrc ? <img src={imageSrc} alt="" className="h-16 w-16 rounded border border-border object-cover" /> : null}
        <div>
          <Label htmlFor={`line-img-${line.clientKey}`}>Imagem do item</Label>
          <FileButton
            id={`line-img-${line.clientKey}`}
            className="mt-1"
            disabled={busy || lineUploading}
            busy={busy || lineUploading}
            onFile={(file) => onUpload(line.clientKey, file)}
          />
          {uploadError ? <p className="mt-1 text-sm text-destructive">{uploadError}</p> : null}
        </div>
        {lineTotal > 0 ? <p className="text-right text-sm text-heat">Valor: {formatBRL(lineTotal)}</p> : null}
      </div>
    </details>
  );
});

type QuotationEditorPaymentRowProps = {
  payment: QuotationEditorPayment;
  index: number;
  onRemove(clientKey: string): void;
  onChange(clientKey: string, patch: Partial<QuotationEditorPayment>): void;
};

export const QuotationEditorPaymentRow = memo(function QuotationEditorPaymentRow({
  payment,
  index,
  onRemove,
  onChange,
}: QuotationEditorPaymentRowProps) {
  return (
    <div className="space-y-2 border border-border p-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(payment.clientKey)}
          aria-label="Remover pagamento"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remover</span>
        </Button>
      </div>
      <Input
        name={`pay.${index}.label`}
        value={payment.label}
        onChange={(e) => onChange(payment.clientKey, { label: e.target.value })}
        placeholder="Rótulo"
      />
      <Input
        name={`pay.${index}.amount`}
        value={payment.amountInput}
        onChange={(e) => onChange(payment.clientKey, { amountInput: e.target.value })}
        placeholder="Valor total da opção"
      />
      <Input
        name={`pay.${index}.detail`}
        value={payment.detail}
        onChange={(e) => onChange(payment.clientKey, { detail: e.target.value })}
        placeholder="Detalhe (opcional)"
      />
    </div>
  );
});
