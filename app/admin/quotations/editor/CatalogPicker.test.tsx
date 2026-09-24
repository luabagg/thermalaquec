// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import { toCatalogVariantOptions } from "~/admin/quotations/editor/catalog-variant-options";

import { CatalogPicker, CatalogPickerPanel } from "./CatalogPicker";

beforeAll(() => {
  // jsdom lacks the layout APIs Radix and cmdk call.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
});

afterEach(cleanup);

const variant = (id: number, name: string) => ({
  id,
  name,
  attributes: [],
  descriptionLines: [],
  priceCents: null,
  imageId: null,
  image: null,
});

const options = toCatalogVariantOptions([
  { id: 1, name: "Válvula", brand: null, categoryId: 10, descriptionLines: [], imageId: null, image: null, variants: [variant(101, "Válvula de retenção")] },
  { id: 2, name: "Boiler", brand: "Warma", categoryId: 20, descriptionLines: [], imageId: null, image: null, variants: [variant(201, "Boiler 400L"), variant(202, "Boiler 600L")] },
]);
const categories = [
  { id: 10, name: "Hidráulica", color: "#0891b2" },
  { id: 20, name: "Aquecimento", color: "#d55711" },
];

// The panel is what the popover shows. Radix Popover takes seconds to mount under jsdom, so it is left out.
function openPicker(onAdd = vi.fn()) {
  const user = userEvent.setup();
  render(<CatalogPickerPanel options={options} categories={categories} onAdd={onAdd} />);
  return { user, onAdd };
}

const optionNames = () => screen.getAllByRole("option").map((option) => option.textContent);

test("adds every selected option at once, in the order they were picked", async () => {
  const { user, onAdd } = openPicker();

  await user.click(screen.getByRole("option", { name: /boiler 600l/i }));
  await user.click(screen.getByRole("option", { name: /válvula de retenção/i }));
  await user.click(screen.getByRole("button", { name: "Adicionar (2)" }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd.mock.calls[0][0].map((option: { variantId: number }) => option.variantId)).toEqual([202, 101]);
});

test("picking an option again removes it from the selection", async () => {
  const { user } = openPicker();

  await user.click(screen.getByRole("option", { name: /boiler 400l/i }));
  await user.click(screen.getByRole("option", { name: /boiler 400l/i }));

  expect((screen.getByRole("button", { name: "Adicionar" }) as HTMLButtonElement).disabled).toBe(true);
});

test("typing without accents finds accented names", async () => {
  const { user } = openPicker();

  await user.type(screen.getByRole("combobox"), "valvula");

  expect(optionNames()).toEqual([expect.stringContaining("Válvula de retenção")]);
});

test("a category shows only its options", async () => {
  const { user } = openPicker();

  await user.click(within(screen.getByRole("group", { name: "Categorias" })).getByRole("button", { name: /aquecimento/i }));

  expect(optionNames()).toEqual([expect.stringContaining("Boiler 400L"), expect.stringContaining("Boiler 600L")]);
});

test("the picker waits for the catalog before it opens", () => {
  render(<CatalogPicker options={null} categories={[]} onAdd={vi.fn()} />);

  expect((screen.getByRole("button", { name: /carregando catálogo/i }) as HTMLButtonElement).disabled).toBe(true);
});
