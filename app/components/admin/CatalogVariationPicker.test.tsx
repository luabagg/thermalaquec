import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  CatalogVariationPicker,
  isCatalogSelectionComplete,
  loadCatalogPickerFamily,
  portuguesePickerError,
  resolveCatalogPickerDraft,
} from "./CatalogVariationPicker";

const family = {
  id: 10,
  options: [
    { id: 1, name: "Capacidade", values: [{ id: 11, label: "400 L" }] },
    { id: 2, name: "Material", values: [{ id: 21, label: "Inox" }] },
  ],
};

const draft = {
  name: "Boiler 400 L",
  descriptionLines: ["Material: Inox"],
  unitPriceCents: 1000,
  imageId: null,
  variantId: null,
  selectionSnapshot: [{ optionSlug: "capacity", optionLabel: "Capacidade", valueSlug: "400-l", valueLabel: "400 L" }],
  catalogResolutionToken: "signed-token",
};

describe("CatalogVariationPicker", () => {
  it("renders only compact family summaries initially", () => {
    const markup = renderToStaticMarkup(
      <CatalogVariationPicker
        summaries={[{ id: 10, slug: "boiler", name: "Boiler", defaultUnitPriceCents: null, imageId: null, Image: null, _count: { options: 2, variants: 1 } }]}
        onAdd={() => undefined}
      />,
    );
    expect(markup).toContain("Produto do catálogo");
    expect(markup).toContain("Boiler");
    expect(markup).not.toContain("Capacidade");
  });

  it("loads configurable family detail lazily through authenticated route", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ family }), { status: 200 }));
    await expect(loadCatalogPickerFamily(10, fetcher)).resolves.toEqual(family);
    expect(fetcher).toHaveBeenCalledWith("/admin/catalog/10/resolve", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("requires one selected value from every option", () => {
    expect(isCatalogSelectionComplete(family, {})).toBe(false);
    expect(isCatalogSelectionComplete(family, { 1: 11 })).toBe(false);
    expect(isCatalogSelectionComplete(family, { 1: 11, 2: 21 })).toBe(true);
  });

  it("resolves configurable and simple selections only on the server", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ draft }), { status: 200 }));
    await expect(resolveCatalogPickerDraft(10, [11, 21], fetcher)).resolves.toEqual(draft);
    await expect(resolveCatalogPickerDraft(20, [], fetcher)).resolves.toEqual(draft);
    expect(fetcher).toHaveBeenNthCalledWith(1, "/admin/catalog/10/resolve", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ selectedValueIds: [11, 21] }),
    }));
    expect(fetcher).toHaveBeenNthCalledWith(2, "/admin/catalog/20/resolve", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ selectedValueIds: [] }),
    }));
  });

  it("preserves unavailable-combination errors for Portuguese UI mapping", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "unknown_combination" }), { status: 409 }));
    await expect(resolveCatalogPickerDraft(10, [11, 21], fetcher)).rejects.toThrow("unknown_combination");
    expect(portuguesePickerError("unknown_combination")).toBe("Esta combinação não está disponível.");
  });

  it("maps request failures to retryable safe copy", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "request_failed" }), { status: 500 }));
    await expect(loadCatalogPickerFamily(10, fetcher)).rejects.toThrow("request_failed");
    expect(portuguesePickerError("request_failed")).toBe("Não foi possível carregar esta configuração.");
  });
});
