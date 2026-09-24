import { ChevronDown, Trash2 } from "lucide-react";
import { memo, useState, type MouseEvent } from "react";

import { Button } from "~/components/ui/button";
import { FileButton } from "~/components/ui/file-button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatBRL } from "~/lib/money";

import { lineTotalCents } from "../quotation-content";
import { lineFieldName, paymentOptionFieldName } from "../quotation-form";
import type { DraftEdit, LineDraft, PaymentOptionDraft } from "./quotation-draft";

type LineDraftRowProps = {
  line: LineDraft;
  index: number;
  /** A save or another upload is running. */
  busy: boolean;
  uploading: boolean;
  uploadError?: string;
  onEdit(edit: DraftEdit): void;
  onUpload(draftKey: string, file: File): void;
};

export const LineDraftRow = memo(function LineDraftRow({ line, index, busy, uploading, uploadError, onEdit, onUpload }: LineDraftRowProps) {
  const lineTotal = lineTotalCents(line);
  // Read once: the row must not collapse while the user types.
  const [initiallyOpen] = useState(line.openOnMount);
  const editLine = (patch: Extract<DraftEdit, { type: "edit-line" }>["patch"]) =>
    onEdit({ type: "edit-line", draftKey: line.draftKey, patch });
  const remove = (event: MouseEvent) => {
    // The button sits in <summary>; without this the click also toggles the row.
    event.preventDefault();
    onEdit({ type: "remove-line", draftKey: line.draftKey });
  };

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
        <RemoveButton label="Remover item" onClick={remove} />
      </summary>
      <div className="space-y-2 px-3 pb-3">
        <input type="hidden" name={lineFieldName(index, "catalogVariantId")} value={line.catalogVariantId ?? ""} />
        <input type="hidden" name={lineFieldName(index, "imageId")} value={line.imageId ?? ""} />
        <Input
          name={lineFieldName(index, "name")}
          value={line.name}
          onChange={(e) => editLine({ name: e.target.value })}
          placeholder="Item"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            name={lineFieldName(index, "quantity")}
            type="number"
            min={1}
            value={line.quantity}
            onChange={(e) => editLine({ quantity: Math.max(1, Number(e.target.value) || 1) })}
            placeholder="Qtd"
          />
          <Input
            name={lineFieldName(index, "price")}
            value={line.priceText}
            onChange={(e) => editLine({ priceText: e.target.value })}
            placeholder="Preço unit."
          />
        </div>
        <textarea
          name={lineFieldName(index, "description")}
          rows={3}
          value={line.description}
          onChange={(e) => editLine({ description: e.target.value })}
          placeholder="Descrição (uma linha por bullet)"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <LineImageField line={line} disabled={busy || uploading} uploadError={uploadError} onUpload={onUpload} />
        {lineTotal > 0 ? <p className="text-right text-sm text-heat">Valor: {formatBRL(lineTotal)}</p> : null}
      </div>
    </details>
  );
});

type LineImageFieldProps = {
  line: LineDraft;
  disabled: boolean;
  uploadError?: string;
  onUpload(draftKey: string, file: File): void;
};

function LineImageField({ line, disabled, uploadError, onUpload }: LineImageFieldProps) {
  const imageSrc = line.thumbnailUrl ?? line.imageUrl;
  const inputId = `line-image-${line.draftKey}`;
  return (
    <>
      {imageSrc ? <img src={imageSrc} alt="" className="h-16 w-16 rounded border border-border object-cover" /> : null}
      <div>
        <Label htmlFor={inputId}>Imagem do item</Label>
        <FileButton id={inputId} className="mt-1" disabled={disabled} busy={disabled} onFile={(file) => onUpload(line.draftKey, file)} />
        {uploadError ? <p className="mt-1 text-sm text-destructive">{uploadError}</p> : null}
      </div>
    </>
  );
}

type PaymentOptionDraftRowProps = {
  option: PaymentOptionDraft;
  index: number;
  onEdit(edit: DraftEdit): void;
};

export const PaymentOptionDraftRow = memo(function PaymentOptionDraftRow({ option, index, onEdit }: PaymentOptionDraftRowProps) {
  const editOption = (patch: Extract<DraftEdit, { type: "edit-payment-option" }>["patch"]) =>
    onEdit({ type: "edit-payment-option", draftKey: option.draftKey, patch });

  return (
    <div className="space-y-2 border border-border p-3">
      <div className="flex justify-end">
        <RemoveButton label="Remover pagamento" onClick={() => onEdit({ type: "remove-payment-option", draftKey: option.draftKey })} />
      </div>
      <Input
        name={paymentOptionFieldName(index, "label")}
        value={option.label}
        onChange={(e) => editOption({ label: e.target.value })}
        placeholder="Rótulo"
      />
      <Input
        name={paymentOptionFieldName(index, "amount")}
        value={option.amountText}
        onChange={(e) => editOption({ amountText: e.target.value })}
        placeholder="Valor total da opção"
      />
      <Input
        name={paymentOptionFieldName(index, "detail")}
        value={option.detail}
        onChange={(e) => editOption({ detail: e.target.value })}
        placeholder="Detalhe (opcional)"
      />
    </div>
  );
});

function RemoveButton({ label, onClick }: { label: string; onClick(event: MouseEvent): void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 text-destructive hover:text-destructive"
      onClick={onClick}
      aria-label={label}
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Remover</span>
    </Button>
  );
}
