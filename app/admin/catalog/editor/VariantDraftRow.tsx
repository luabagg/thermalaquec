import { ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { variantFieldName } from "../product-form";
import { CatalogImageField } from "./CatalogImageField";
import type { VariantDraft } from "./variant-draft";

const areaClass = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

type VariantDraftRowProps = {
  variant: VariantDraft;
  index: number;
  /** A product keeps at least one variant. */
  canRemove: boolean;
  uploading: boolean;
  onChange(patch: Partial<VariantDraft>): void;
  onRemove(): void;
  onUpload(file: File): void;
};

export function VariantDraftRow({ variant, index, canRemove, uploading, onChange, onRemove, onUpload }: VariantDraftRowProps) {
  // Read once: the row must not collapse while the user types.
  const [initiallyOpen] = useState(variant.openOnMount);
  const field = (name: Parameters<typeof variantFieldName>[1]) => variantFieldName(index, name);
  const id = (name: string) => `variant-${variant.draftKey}-${name}`;

  return (
    <details
      open={initiallyOpen}
      // Closed fields still submit; open the row so the browser can show a validation error.
      onInvalidCapture={(event) => (event.currentTarget.open = true)}
      className="group border border-border"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{variant.name || "Sem nome"}</span>
        {!variant.active ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inativa</span> : null}
        {variant.priceText ? <span className="shrink-0 text-xs text-muted-foreground">R$ {variant.priceText}</span> : null}
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-destructive hover:text-destructive"
            aria-label="Remover variante"
            onClick={(event) => {
              // The button sits in <summary>; without this the click also toggles the row.
              event.preventDefault();
              onRemove();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </summary>
      <div className="grid grid-cols-1 gap-3 px-3 pb-3 sm:grid-cols-2">
        <input type="hidden" name={field("id")} value={variant.id ?? ""} />
        <input type="hidden" name={field("imageId")} value={variant.imageId ?? ""} />
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor={id("name")}>Nome impresso</Label>
          <Input id={id("name")} name={field("name")} value={variant.name} onChange={(e) => onChange({ name: e.target.value })} required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={id("price")}>Preço (opcional)</Label>
          <Input
            id={id("price")}
            name={field("price")}
            value={variant.priceText}
            inputMode="decimal"
            placeholder="0,00"
            onChange={(e) => onChange({ priceText: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name={field("active")} checked={variant.active} onChange={(e) => onChange({ active: e.target.checked })} />
          Disponível no orçamento
        </label>
        <div className="grid gap-1">
          <Label htmlFor={id("attributes")}>Atributos (“Nome: valor” por linha)</Label>
          <textarea
            id={id("attributes")}
            name={field("attributes")}
            rows={3}
            value={variant.attributesText}
            placeholder={"Capacidade: 400L\nMaterial: Inox 316"}
            onChange={(e) => onChange({ attributesText: e.target.value })}
            className={areaClass}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={id("description")}>Bullets desta variante</Label>
          <textarea
            id={id("description")}
            name={field("description")}
            rows={3}
            value={variant.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className={areaClass}
          />
        </div>
        <div className="sm:col-span-2">
          <CatalogImageField
            inputId={id("image")}
            previewUrl={variant.previewUrl}
            clearLabel={variant.imageId ? "Usar imagem do produto" : null}
            uploading={uploading}
            previewClassName="h-12 w-12"
            onFile={onUpload}
            onClear={() => onChange({ imageId: null, previewUrl: null })}
          />
        </div>
      </div>
    </details>
  );
}
