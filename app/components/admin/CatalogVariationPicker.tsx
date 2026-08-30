import { useEffect, useMemo, useState } from "react";

import { Button } from "~/components/ui/button";

export type CatalogPickerSummary = {
  id: number;
  slug: string;
  name: string;
  defaultUnitPriceCents: number | null;
  imageId: number | null;
  Image: { location: string; thumbnail: string | null } | null;
  _count: { options: number; variants: number };
};

type CatalogPickerFamily = {
  id: number;
  options: Array<{
    id: number;
    name: string;
    values: Array<{ id: number; label: string }>;
  }>;
};

export type CatalogPickerResolvedDraft = {
  name: string;
  descriptionLines: string[];
  unitPriceCents: number | null;
  imageId: number | null;
  imageUrl: string | null;
  imageThumbnail: string | null;
  variantId: number | null;
  selectionSnapshot: Array<{
    optionSlug: string;
    optionLabel: string;
    valueSlug: string;
    valueLabel: string;
  }>;
  catalogResolutionToken: string;
};

export type CatalogPickerAddedDraft = CatalogPickerResolvedDraft & {
  catalogItemId: number;
  imageUrl: string | null;
  imageThumbnail: string | null;
};

type Props = {
  summaries: CatalogPickerSummary[];
  onAdd: (draft: CatalogPickerAddedDraft) => void;
};

type PickerFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function loadCatalogPickerFamily(id: number, fetcher: PickerFetch = fetch, signal?: AbortSignal) {
  const response = await fetcher(`/admin/catalog/${id}/resolve`, { credentials: "same-origin", signal });
  const data = (await response.json()) as { family?: CatalogPickerFamily; error?: string };
  if (!response.ok || !data.family) throw new Error(data.error ?? "request_failed");
  return data.family;
}

export async function resolveCatalogPickerDraft(
  id: number,
  selectedValueIds: number[],
  fetcher: PickerFetch = fetch,
  signal?: AbortSignal,
) {
  const response = await fetcher(`/admin/catalog/${id}/resolve`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedValueIds }),
    signal,
  });
  const data = (await response.json()) as { draft?: CatalogPickerResolvedDraft; error?: string };
  if (!response.ok || !data.draft) throw new Error(data.error ?? "request_failed");
  return data.draft;
}

export function isCatalogSelectionComplete(
  family: CatalogPickerFamily | null,
  selectedValueIds: Record<number, number>,
) {
  return Boolean(family && family.options.length > 0 && family.options.every((option) => selectedValueIds[option.id]));
}

export function portuguesePickerError(error?: string) {
  if (error === "unknown_combination") return "Esta combinação não está disponível.";
  if (error === "missing_option") return "Selecione uma opção em cada campo.";
  return "Não foi possível carregar esta configuração.";
}

export function CatalogVariationPicker({ summaries, onAdd }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [family, setFamily] = useState<CatalogPickerFamily | null>(null);
  const [selectedValueIds, setSelectedValueIds] = useState<Record<number, number>>({});
  const [resolved, setResolved] = useState<CatalogPickerResolvedDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const summary = useMemo(
    () => summaries.find((candidate) => String(candidate.id) === selectedId) ?? null,
    [selectedId, summaries],
  );

  function clear() {
    setSelectedId("");
    setFamily(null);
    setSelectedValueIds({});
    setResolved(null);
    setError(null);
    setBusy(false);
  }

  useEffect(() => {
    if (!summary) return;
    const controller = new AbortController();
    setError(null);
    setResolved(null);
    setSelectedValueIds({});
    setFamily(null);
    setBusy(true);

    if (summary._count.options === 0) {
      resolveCatalogPickerDraft(summary.id, [], fetch, controller.signal)
        .then((draft) => {
          if (controller.signal.aborted) return;
          onAdd({ ...draft, catalogItemId: summary.id });
          clear();
        })
        .catch((cause: unknown) => {
          if ((cause as { name?: string }).name !== "AbortError") {
            setError(portuguesePickerError((cause as Error).message));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
      return () => controller.abort();
    }

    loadCatalogPickerFamily(summary.id, fetch, controller.signal)
      .then((loadedFamily) => {
        if (!controller.signal.aborted) setFamily(loadedFamily);
      })
      .catch((cause: unknown) => {
        if ((cause as { name?: string }).name !== "AbortError") {
          setError(portuguesePickerError((cause as Error).message));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [onAdd, retry, summary]);

  const selectionComplete = isCatalogSelectionComplete(family, selectedValueIds);

  useEffect(() => {
    if (!summary || !family || !selectionComplete) {
      setResolved(null);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    setResolved(null);
    resolveCatalogPickerDraft(
      summary.id,
      family.options.map((option) => selectedValueIds[option.id]),
      fetch,
      controller.signal,
    )
      .then((draft) => {
        if (!controller.signal.aborted) setResolved(draft);
      })
      .catch((cause: unknown) => {
        if ((cause as { name?: string }).name !== "AbortError") {
          setError(portuguesePickerError((cause as Error).message));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [family, selectedValueIds, selectionComplete, summary]);

  function addResolved() {
    if (!summary || !resolved) return;
    onAdd({ ...resolved, catalogItemId: summary.id });
    clear();
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <select
        aria-label="Produto do catálogo"
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm"
        disabled={busy && summary?._count.options === 0}
      >
        <option value="">Do catálogo…</option>
        {summaries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>

      {summary?._count.options ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={!resolved || busy} onClick={addResolved}>Adicionar</Button>
          <Button type="button" size="sm" variant="outline" onClick={clear}>Cancelar</Button>
        </div>
      ) : null}

      {family?.options.map((option) => (
        <label key={option.id} className="grid gap-1 text-sm">
          <span>{option.name}</span>
          <select
            aria-label={option.name}
            value={selectedValueIds[option.id] ?? ""}
            onChange={(event) => setSelectedValueIds((current) => ({
              ...current,
              [option.id]: Number(event.target.value),
            }))}
            className="h-9 rounded-md border border-input bg-background px-2"
          >
            <option value="">Selecione…</option>
            {option.values.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}
          </select>
        </label>
      ))}

      {resolved ? (
        <div role="status" aria-live="polite" className="rounded border border-border p-3 text-sm sm:col-span-2">
          {resolved.imageUrl ? (
            <img src={resolved.imageThumbnail ?? resolved.imageUrl} alt="" className="mb-2 h-16 w-16 object-contain" />
          ) : null}
          <p className="font-medium">{resolved.name}</p>
          {resolved.descriptionLines.map((line) => <p key={line} className="text-muted-foreground">{line}</p>)}
        </div>
      ) : null}
      {busy ? <p role="status" aria-live="polite" className="text-sm text-muted-foreground sm:col-span-2">Carregando…</p> : null}
      {error ? (
        <div className="flex items-center gap-2 sm:col-span-2">
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</Button>
        </div>
      ) : null}
    </div>
  );
}
