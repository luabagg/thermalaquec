import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { filterCatalogVariantOptions, type CatalogVariantOption } from "~/admin/quotations/editor/catalog-variant-options";
import { formatBRL } from "~/lib/money";

export type CatalogPickerCategory = { id: number; name: string; color: string };

type Props = {
  /** Null while the catalog is still loading. */
  options: CatalogVariantOption[] | null;
  categories: CatalogPickerCategory[];
  /** Receives the chosen options in the order they were selected. */
  onAdd(options: CatalogVariantOption[]): void;
};

/** Consecutive options of one product form a group with the product name as heading. */
function groupByProduct(options: CatalogVariantOption[]) {
  const runs: { key: string; heading: string | null; options: CatalogVariantOption[] }[] = [];
  for (const option of options) {
    const last = runs[runs.length - 1];
    if (last && option.group !== null && last.heading === option.group && last.options[0].productId === option.productId) {
      last.options.push(option);
    } else {
      runs.push({ key: `${option.productId}-${option.variantId}`, heading: option.group, options: [option] });
    }
  }
  return runs;
}

function CategoryDot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export function CatalogPicker({ options, categories, onAdd }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal" disabled={!options}>
          {options ? "Adicionar do catálogo…" : "Carregando catálogo…"}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] min-w-[min(22rem,calc(100vw-2rem))] flex-col p-0">
        {options ? (
          <CatalogPickerPanel
            options={options}
            categories={categories}
            onAdd={(selected) => {
              onAdd(selected);
              setOpen(false);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

type PanelProps = { options: CatalogVariantOption[]; categories: CatalogPickerCategory[]; onAdd(options: CatalogVariantOption[]): void };

/** Search, category filter and multi-selection. Closing the popover discards the selection. */
export function CatalogPickerPanel({ options, categories, onAdd }: PanelProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const optionById = useMemo(() => new Map(options.map((option) => [option.variantId, option])), [options]);
  const visible = useMemo(() => filterCatalogVariantOptions(options, search, categoryId), [options, search, categoryId]);

  function toggle(variantId: number) {
    setSelected((current) => (current.includes(variantId) ? current.filter((id) => id !== variantId) : [...current, variantId]));
  }

  function addSelected() {
    onAdd(selected.flatMap((id) => optionById.get(id) ?? []));
    setSelected([]);
    setSearch("");
  }

  const chip = (id: number | null, label: string, color?: string) => (
    <button
      key={id ?? "all"}
      type="button"
      aria-pressed={categoryId === id}
      onClick={() => setCategoryId(id)}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-5",
        categoryId === id ? "border-foreground bg-foreground text-background" : "border-border hover:bg-secondary"
      )}
    >
      {color ? <CategoryDot color={color} /> : null}
      {label}
    </button>
  );

  return (
    <Command shouldFilter={false} loop label="Catálogo" className="flex max-h-[min(38rem,75vh)] flex-col">
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder="Buscar produto, marca ou medida…"
        className="h-10 shrink-0 border-b border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="flex shrink-0 flex-wrap gap-1 border-b border-border px-2 py-1.5" role="group" aria-label="Categorias">
        {chip(null, "Todas")}
        {categories.map((category) => chip(category.id, category.name, category.color))}
      </div>
      <Command.List className="min-h-0 flex-1 overflow-y-auto p-1">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</Command.Empty>
        {groupByProduct(visible).map((run) => (
          <Command.Group
            key={run.key}
            heading={run.heading ?? undefined}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {run.options.map((option) => {
              const isSelected = selected.includes(option.variantId);
              const category = option.categoryId === null ? undefined : categoryById.get(option.categoryId);
              return (
                <Command.Item
                  key={option.variantId}
                  value={String(option.variantId)}
                  onSelect={() => toggle(option.variantId)}
                  // Rows outside the scrolled view skip layout, which keeps opening the full catalog fast.
                  className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm [contain-intrinsic-size:auto_2.75rem] [content-visibility:auto] data-[selected=true]:bg-secondary"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      isSelected ? "border-foreground bg-foreground text-background" : "border-input"
                    )}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {categoryId === null && category ? <CategoryDot color={category.color} /> : null}
                      <span className="min-w-0 break-words">{option.name}</span>
                    </span>
                    {option.attributes.length > 0 ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {option.attributes.map((attribute) => attribute.value).join(" · ")}
                      </span>
                    ) : null}
                  </span>
                  {option.unitPriceCents !== null ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{formatBRL(option.unitPriceCents)}</span>
                  ) : null}
                  <span className="sr-only">{isSelected ? "selecionado" : ""}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-2 py-2">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {selected.length === 0 ? "Selecione um ou mais itens" : `${selected.length} selecionado(s)`}
        </span>
        <div className="flex gap-2">
          {selected.length > 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelected([])}>
              Limpar
            </Button>
          ) : null}
          <Button type="button" size="sm" disabled={selected.length === 0} onClick={addSelected}>
            Adicionar{selected.length > 0 ? ` (${selected.length})` : ""}
          </Button>
        </div>
      </div>
    </Command>
  );
}
