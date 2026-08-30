import { afterEach, expect, test, vi } from "vitest";

const { requireAdminMock, detailMock, toInputMock, resolveMock, tokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  detailMock: vi.fn(),
  toInputMock: vi.fn(),
  resolveMock: vi.fn(),
  tokenMock: vi.fn(() => "signed-token"),
}));

vi.mock("~/utils/require-admin.server", () => ({ requireAdmin: requireAdminMock }));
vi.mock("~/models/catalog.server", () => ({ getCatalogFamilyDetail: detailMock }));
vi.mock("~/utils/catalog-admin", () => ({
  toCatalogFamilyInput: toInputMock,
  parseIntegerArray: (value: unknown) => Array.isArray(value) ? value : [],
}));
vi.mock("~/utils/catalog-resolver", () => ({ resolveCatalogSelection: resolveMock }));
vi.mock("~/utils/catalog-selection-token.server", () => ({
  createCatalogSelectionToken: tokenMock,
  requireCatalogSelectionSecret: vi.fn(() => "secret"),
}));

afterEach(() => vi.clearAllMocks());

const item = { id: 10, archivedAt: null };
const family = { id: 10, options: [{ id: 1, values: [] }], variants: [] };

test("GET requires admin and returns active ordered family detail", async () => {
  detailMock.mockResolvedValueOnce(item);
  toInputMock.mockReturnValueOnce(family);
  const { loader } = await import("./admin.catalog.$id_.resolve");
  const request = new Request("https://thermal.test/admin/catalog/10/resolve");
  const response = await loader({ request, params: { id: "10" }, context: {} } as never);
  expect(requireAdminMock).toHaveBeenCalledWith(request);
  await expect(response.json()).resolves.toEqual({ family });
});

test.each([null, { id: 10, archivedAt: new Date() }])("rejects missing or archived families", async (record) => {
  detailMock.mockResolvedValueOnce(record);
  const { loader } = await import("./admin.catalog.$id_.resolve");
  await expect(loader({ request: new Request("https://thermal.test/admin/catalog/10/resolve"), params: { id: "10" }, context: {} } as never))
    .rejects.toMatchObject({ status: 404 });
});

test("POST returns only the server-resolved draft and signed token", async () => {
  detailMock.mockResolvedValueOnce(item);
  toInputMock.mockReturnValueOnce(family);
  resolveMock.mockReturnValueOnce({ ok: true, value: {
    name: "Boiler 400 L", descriptionLines: ["400 L"], unitPriceCents: 1000,
    imageId: null, variantId: 3, selectionSnapshot: [],
  } });
  const { action } = await import("./admin.catalog.$id_.resolve");
  const request = new Request("https://thermal.test/admin/catalog/10/resolve", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedValueIds: [11] }),
  });
  const response = await action({ request, params: { id: "10" }, context: {} } as never);
  expect(requireAdminMock).toHaveBeenCalledWith(request);
  expect(resolveMock).toHaveBeenCalledWith(family, [11]);
  await expect(response.json()).resolves.toMatchObject({ draft: { name: "Boiler 400 L", catalogResolutionToken: "signed-token" } });
});

test.each([["missing_option", 400], ["unknown_value", 400], ["unknown_combination", 409]])(
  "maps %s safely", async (error, status) => {
    detailMock.mockResolvedValueOnce(item);
    toInputMock.mockReturnValueOnce(family);
    resolveMock.mockReturnValueOnce({ ok: false, error });
    const { action } = await import("./admin.catalog.$id_.resolve");
    const response = await action({ request: new Request("https://thermal.test/admin/catalog/10/resolve", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    }), params: { id: "10" }, context: {} } as never);
    expect(response.status).toBe(status);
  },
);

test("returns 400 for malformed JSON", async () => {
  detailMock.mockResolvedValueOnce(item);
  const { action } = await import("./admin.catalog.$id_.resolve");
  const response = await action({ request: new Request("https://thermal.test/admin/catalog/10/resolve", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  }), params: { id: "10" }, context: {} } as never);
  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
});
