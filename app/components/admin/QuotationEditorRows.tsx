import { memo } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { FileButton } from "~/components/ui/file-button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatBRL } from "~/utils/quotation";

export type QuotationEditorLine = {
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
  imageThumbnail: string | null;
};

export type QuotationEditorPayment = {
  id: number | null;
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

  return (
    <div className="space-y-2 border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">#{index + 1}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(line.clientKey)}
          aria-label="Remover item"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remover</span>
        </Button>
      </div>
      <input type="hidden" name={`line.${index}.catalogItemId`} value={line.catalogItemId ?? ""} />
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
      {line.quantity * line.unitPriceCents > 0 ? (
        <p className="text-right text-sm text-heat">Valor: {formatBRL(line.quantity * line.unitPriceCents)}</p>
      ) : null}
    </div>
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
