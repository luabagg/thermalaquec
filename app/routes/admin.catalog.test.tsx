import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect, test, vi } from "vitest";

const {
  requireAdminMock,
  listCatalogSummariesMock,
  createCatalogFamilyMock,
  archiveCatalogFamilyMock,
  restoreCatalogFamilyMock,
  deleteCatalogFamilyMock,
  getCatalogDeletionEligibilityByIdsMock,
  getCatalogFamilyDetailMock,
  updateCatalogFamilyAggregateMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listCatalogSummariesMock: vi.fn(),
  createCatalogFamilyMock: vi.fn(),
  archiveCatalogFamilyMock: vi.fn(),
  restoreCatalogFamilyMock: vi.fn(),
  deleteCatalogFamilyMock: vi.fn(),
  getCatalogDeletionEligibilityByIdsMock: vi.fn(),
  getCatalogFamilyDetailMock: vi.fn(),
  updateCatalogFamilyAggregateMock: vi.fn(),
}));

vi.mock("~/utils/require-admin.server", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("~/models/catalog.server", () => ({
  listCatalogSummaries: listCatalogSummariesMock,
  createCatalogFamily: createCatalogFamilyMock,
  archiveCatalogFamily: archiveCatalogFamilyMock,
  restoreCatalogFamily: restoreCatalogFamilyMock,
  deleteCatalogFamily: deleteCatalogFamilyMock,
  getCatalogDeletionEligibilityByIds: getCatalogDeletionEligibilityByIdsMock,
  getCatalogFamilyDetail: getCatalogFamilyDetailMock,
  updateCatalogFamilyAggregate: updateCatalogFamilyAggregateMock,
}));

function actionArgs(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return { request: new Request("https://thermal.test/admin/catalog", { method: "POST", body: form }), params: {}, context: {} } as never;
}

test("loads searched archived summaries and requires admin", async () => {
  requireAdminMock.mockResolvedValue({ user: { id: "user-1" } });
  listCatalogSummariesMock.mockResolvedValueOnce([]);

  const { loader } = await import("./admin.catalog");
  const request = new Request("https://thermal.test/admin/catalog?status=archived&q=boiler");
  await loader({ request, params: {}, context: {} } as never);

  expect(requireAdminMock).toHaveBeenCalledWith(request);
  expect(listCatalogSummariesMock).toHaveBeenCalledWith({ status: "archived", search: "boiler" });
});

test("archives with optimistic concurrency and reports stale edits", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  archiveCatalogFamilyMock.mockResolvedValueOnce({ ok: false, error: "stale" });

  const { action } = await import("./admin.catalog");
  const response = await action(actionArgs({ intent: "archive", id: "1", expectedUpdatedAt: "2026-08-29T00:00:00.000Z" }));

  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toEqual({
    error: "Este produto foi alterado em outra aba. Recarregue e tente novamente.",
  });
});

test("creates a new catalog family", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  createCatalogFamilyMock.mockResolvedValueOnce({ id: 9 });

  const { action } = await import("./admin.catalog");
  const response = await action(actionArgs({ intent: "create", name: "Boiler", price: "1.234,56", description: "Line one\nLine two" }));

  expect(response.status).toBe(200);
  expect(createCatalogFamilyMock).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Boiler",
      descriptionLines: ["Line one", "Line two"],
      defaultUnitPriceCents: 123456,
    })
  );
});

test("restores an archived family", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  restoreCatalogFamilyMock.mockResolvedValueOnce({ ok: true, item: { id: 1 } });

  const { action } = await import("./admin.catalog");
  const response = await action(actionArgs({ intent: "restore", id: "1", expectedUpdatedAt: "2026-08-29T00:00:00.000Z" }));

  expect(response.status).toBe(200);
  expect(restoreCatalogFamilyMock).toHaveBeenCalledWith(1, "2026-08-29T00:00:00.000Z");
});

test("rejects delete when family is referenced", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  deleteCatalogFamilyMock.mockResolvedValueOnce({ ok: false, error: "referenced" });

  const { action } = await import("./admin.catalog");
  const response = await action(actionArgs({ intent: "delete", id: "1", expectedUpdatedAt: "2026-08-29T00:00:00.000Z" }));

  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("referenciado") });
});

test("set-image routes through aggregate optimistic concurrency", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  getCatalogFamilyDetailMock.mockResolvedValueOnce({
    id: 1,
    slug: "boiler",
    name: "Boiler",
    nameTemplate: null,
    descriptionLines: [],
    defaultUnitPriceCents: null,
    imageId: null,
    updatedAt: new Date("2026-08-29T00:00:00.000Z"),
    options: [],
    variants: [],
  });
  updateCatalogFamilyAggregateMock.mockResolvedValueOnce({ ok: true, item: { id: 1 } });

  const { action } = await import("./admin.catalog");
  const response = await action(
    actionArgs({
      intent: "set-image",
      catalogItemId: "1",
      imageId: "42",
      expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
    })
  );

  expect(response.status).toBe(200);
  expect(updateCatalogFamilyAggregateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 1,
      expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
      family: expect.objectContaining({ imageId: 42 }),
    })
  );
});

test("catalog list renders alias counts", async () => {
  const route = await import("./admin.catalog");
  const router = createMemoryRouter([{ id: "catalog-list", path: "/admin/catalog", element: <route.default /> }], {
    initialEntries: ["/admin/catalog"],
    hydrationData: {
      loaderData: {
        "catalog-list": {
          status: "active",
          search: "",
          eligibility: [{ id: 1, eligible: true, quotationLines: 0 }],
          items: [
            {
              id: 1,
              slug: "boiler",
              name: "Boiler",
              nameTemplate: null,
              defaultUnitPriceCents: null,
              imageId: null,
              archivedAt: null,
              updatedAt: "2026-08-29T00:00:00.000Z",
              Image: null,
              _count: { options: 2, variants: 3 },
            },
          ],
        },
      },
    },
  });

  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const markup = renderToStaticMarkup(<RouterProvider router={router} />);
  consoleError.mockRestore();
  expect(markup).toContain("2 opções · 3 combinações");
});

test("loader defaults status to active and empty search", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  listCatalogSummariesMock.mockResolvedValueOnce([]);
  getCatalogDeletionEligibilityByIdsMock.mockResolvedValue(new Map());

  const { loader } = await import("./admin.catalog");
  await loader({ request: new Request("https://thermal.test/admin/catalog"), params: {}, context: {} } as never);

  expect(listCatalogSummariesMock).toHaveBeenCalledWith({ status: "active", search: "" });
});

test("loader reads deletion eligibility for the whole page in one call", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  listCatalogSummariesMock.mockResolvedValueOnce([{ id: 7 }, { id: 9 }]);
  getCatalogDeletionEligibilityByIdsMock.mockClear();
  getCatalogDeletionEligibilityByIdsMock.mockResolvedValue(new Map([
    [7, { eligible: true, quotationLines: 0 }],
    [9, { eligible: false, quotationLines: 1 }],
  ]));

  const { loader } = await import("./admin.catalog");
  const response = await loader({ request: new Request("https://thermal.test/admin/catalog"), params: {}, context: {} } as never);

  expect(getCatalogDeletionEligibilityByIdsMock).toHaveBeenCalledTimes(1);
  expect(getCatalogDeletionEligibilityByIdsMock).toHaveBeenCalledWith([7, 9]);
  expect((await response.json()).eligibility).toEqual([
    { id: 7, eligible: true, quotationLines: 0 },
    { id: 9, eligible: false, quotationLines: 1 },
  ]);
});
