import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  saveQuotation: vi.fn(),
  getQuotation: vi.fn(),
  listClientOptions: vi.fn(),
  listProductsForQuotation: vi.fn(),
  listCatalogCategories: vi.fn(),
}));

vi.mock("~/utils/require-admin.server", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("~/admin/quotations/quotation.server", () => ({ saveQuotation: mocks.saveQuotation, getQuotation: mocks.getQuotation }));
vi.mock("~/models/client.server", () => ({ listClientOptions: mocks.listClientOptions }));
vi.mock("~/admin/catalog/catalog.server", () => ({
  listProductsForQuotation: mocks.listProductsForQuotation,
  listCatalogCategories: mocks.listCatalogCategories,
}));

afterEach(() => vi.clearAllMocks());

const user = { user: { id: "user-1", email: "rep@example.com" } };

function post(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request("http://localhost/admin/quotations/42", { method: "POST", body: form });
}

const baseFields = { clientId: "3", issuedAt: "2026-09-23", status: "draft", lineCount: "0", paymentOptionCount: "0" };

test("the editor renders before the catalog finishes loading", async () => {
  mocks.requireAdmin.mockResolvedValue(user);
  mocks.getQuotation.mockResolvedValue({ id: 42 });
  mocks.listClientOptions.mockResolvedValue([]);
  mocks.listProductsForQuotation.mockReturnValue(new Promise(() => {}));
  mocks.listCatalogCategories.mockResolvedValue([]);
  const { loader } = await import("./admin.quotations.$id");

  const result = await loader({ request: new Request("http://localhost/admin/quotations/42"), params: { id: "42" } } as never);

  expect(result.quotation).toEqual({ id: 42 });
  expect(result.catalog).toBeInstanceOf(Promise);
});

test("a save echoes its revision so the editor can ignore stale responses", async () => {
  mocks.requireAdmin.mockResolvedValue(user);
  mocks.saveQuotation.mockResolvedValue({ ok: true });
  const { action } = await import("./admin.quotations.$id");

  const result = await action({ request: post({ ...baseFields, intent: "autosave", revision: "9" }), params: { id: "42" } } as never);

  expect(result.data).toEqual({ ok: true, revision: 9 });
  expect(mocks.saveQuotation).toHaveBeenCalledWith(expect.objectContaining({ quotationId: 42, ownerUserId: "user-1", clientId: 3 }));
});

test("save-and-print answers with the print page", async () => {
  mocks.requireAdmin.mockResolvedValue(user);
  mocks.saveQuotation.mockResolvedValue({ ok: true });
  const { action } = await import("./admin.quotations.$id");

  const result = await action({ request: post({ ...baseFields, intent: "save-print", revision: "10" }), params: { id: "42" } } as never);

  expect(result.data).toMatchObject({ ok: true, redirectTo: "/admin/quotations/42/print?autoprint=1" });
});

test("a failed save reports its status and error with the revision", async () => {
  mocks.requireAdmin.mockResolvedValue(user);
  mocks.saveQuotation.mockResolvedValue({ ok: false, status: 404, error: "Orçamento não encontrado." });
  const { action } = await import("./admin.quotations.$id");

  const result = await action({ request: post({ ...baseFields, intent: "save", revision: "4" }), params: { id: "42" } } as never);

  expect(result.init?.status).toBe(404);
  expect(result.data).toEqual({ ok: false, status: 404, error: "Orçamento não encontrado.", revision: 4 });
});

test("editor saves keep the draft, while a client edit reloads the page data", async () => {
  const { shouldRevalidate } = await import("./admin.quotations.$id");

  expect(shouldRevalidate({ actionResult: { ok: true, revision: 1 }, defaultShouldRevalidate: true } as never)).toBe(false);
  expect(shouldRevalidate({ actionResult: { saved: true }, defaultShouldRevalidate: true } as never)).toBe(true);
});
