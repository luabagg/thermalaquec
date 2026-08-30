// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogVariationPicker, type CatalogPickerResolvedDraft } from "./CatalogVariationPicker";

const configurable = {
  id: 10,
  slug: "boiler",
  name: "Boiler configurável",
  defaultUnitPriceCents: null,
  imageId: 1,
  Image: { location: "/base.webp", thumbnail: "/base-thumb.webp" },
  _count: { options: 1, variants: 2 },
};
const otherConfigurable = {
  ...configurable,
  id: 11,
  slug: "heat-pump",
  name: "Bomba configurável",
};
const simple = {
  ...configurable,
  id: 20,
  slug: "simple",
  name: "Produto simples",
  _count: { options: 0, variants: 0 },
};
const family = {
  id: 10,
  options: [{
    id: 1,
    name: "Capacidade",
    values: [{ id: 11, label: "400 L" }, { id: 12, label: "600 L" }],
  }],
};

function resolvedDraft(overrides: Partial<CatalogPickerResolvedDraft> = {}): CatalogPickerResolvedDraft {
  return {
    name: "Boiler 400 L",
    descriptionLines: ["Material: Inox"],
    unitPriceCents: 1000,
    imageId: 77,
    imageUrl: "/variant.webp",
    imageThumbnail: "/variant-thumb.webp",
    variantId: 3,
    selectionSnapshot: [{
      optionSlug: "capacity",
      optionLabel: "Capacidade",
      valueSlug: "400-l",
      valueLabel: "400 L",
    }],
    catalogResolutionToken: "signed-token",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CatalogVariationPicker interactions", () => {
  it("keeps Add disabled until option resolution, previews the trusted variant image, and inserts the signed draft", async () => {
    const onAdd = vi.fn();
    const detail = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(detail.promise)
      .mockResolvedValueOnce(jsonResponse({ draft: resolvedDraft() }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CatalogVariationPicker summaries={[configurable]} onAdd={onAdd} />);

    await user.selectOptions(screen.getByLabelText("Produto do catálogo"), "10");
    expect((screen.getByRole("button", { name: "Adicionar" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Carregando");

    detail.resolve(jsonResponse({ family }));
    const capacity = await screen.findByLabelText("Capacidade");
    await user.selectOptions(capacity, "11");
    await screen.findByText("Boiler 400 L");
    const preview = screen.getByRole("status");
    expect(preview.getAttribute("aria-live")).toBe("polite");
    expect(preview.querySelector("img")?.getAttribute("src")).toBe("/variant-thumb.webp");
    expect((screen.getByRole("button", { name: "Adicionar" }) as HTMLButtonElement).disabled).toBe(false);

    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      catalogItemId: 10,
      catalogResolutionToken: "signed-token",
      imageUrl: "/variant.webp",
      imageThumbnail: "/variant-thumb.webp",
      selectionSnapshot: expect.any(Array),
    }));
    expect((screen.getByLabelText("Produto do catálogo") as HTMLSelectElement).value).toBe("");
  });

  it("resolves a simple family immediately and adds only the signed server draft", async () => {
    const onAdd = vi.fn();
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ draft: resolvedDraft({
      name: "Produto simples",
      imageId: 1,
      imageUrl: "/simple.webp",
      imageThumbnail: "/simple-thumb.webp",
      selectionSnapshot: [],
    }) }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CatalogVariationPicker summaries={[simple]} onAdd={onAdd} />);

    await user.selectOptions(screen.getByLabelText("Produto do catálogo"), "20");
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/admin/catalog/20/resolve", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ selectedValueIds: [] }),
    }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      catalogItemId: 20,
      catalogResolutionToken: "signed-token",
      imageUrl: "/simple.webp",
    }));
  });

  it("shows request errors as alerts and retries loading family detail", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: "request_failed" }, 500))
      .mockResolvedValueOnce(jsonResponse({ family }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CatalogVariationPicker summaries={[configurable]} onAdd={() => undefined} />);

    await user.selectOptions(screen.getByLabelText("Produto do catálogo"), "10");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Não foi possível carregar esta configuração");
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByLabelText("Capacidade")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports unavailable combinations and never enables Add", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ family }))
      .mockResolvedValueOnce(jsonResponse({ error: "unknown_combination" }, 409));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CatalogVariationPicker summaries={[configurable]} onAdd={() => undefined} />);

    await user.selectOptions(screen.getByLabelText("Produto do catálogo"), "10");
    await user.selectOptions(await screen.findByLabelText("Capacidade"), "11");
    expect((await screen.findByRole("alert")).textContent).toContain("Esta combinação não está disponível");
    expect((screen.getByRole("button", { name: "Adicionar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("cancels a configurable selection and can switch families", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ family }))
      .mockResolvedValueOnce(jsonResponse({ family: { id: 11, options: [{ id: 2, name: "Potência", values: [] }] } }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CatalogVariationPicker summaries={[configurable, otherConfigurable]} onAdd={() => undefined} />);

    await user.selectOptions(screen.getByLabelText("Produto do catálogo"), "10");
    await screen.findByLabelText("Capacidade");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect((screen.getByLabelText("Produto do catálogo") as HTMLSelectElement).value).toBe("");
    expect(screen.queryByLabelText("Capacidade")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Produto do catálogo"), "11");
    expect(await screen.findByLabelText("Potência")).toBeTruthy();
  });

  it("ignores stale family and option-resolution responses after aborting them", async () => {
    const firstFamily = deferred<Response>();
    const oldResolution = deferred<Response>();
    const newResolution = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(firstFamily.promise)
      .mockResolvedValueOnce(jsonResponse({ family: { id: 11, options: [{ id: 2, name: "Potência", values: [{ id: 31, label: "10 kW" }, { id: 32, label: "20 kW" }] }] } }))
      .mockReturnValueOnce(oldResolution.promise)
      .mockReturnValueOnce(newResolution.promise);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CatalogVariationPicker summaries={[configurable, otherConfigurable]} onAdd={() => undefined} />);

    await user.selectOptions(screen.getByLabelText("Produto do catálogo"), "10");
    await user.selectOptions(screen.getByLabelText("Produto do catálogo"), "11");
    expect(await screen.findByLabelText("Potência")).toBeTruthy();
    firstFamily.resolve(jsonResponse({ family }));
    await Promise.resolve();
    expect(screen.queryByLabelText("Capacidade")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Potência"), "31");
    await user.selectOptions(screen.getByLabelText("Potência"), "32");
    oldResolution.resolve(jsonResponse({ draft: resolvedDraft({ name: "Resultado antigo" }) }));
    await Promise.resolve();
    expect(screen.queryByText("Resultado antigo")).toBeNull();
    newResolution.resolve(jsonResponse({ draft: resolvedDraft({ name: "Resultado atual" }) }));
    expect(await screen.findByText("Resultado atual")).toBeTruthy();
  });
});
