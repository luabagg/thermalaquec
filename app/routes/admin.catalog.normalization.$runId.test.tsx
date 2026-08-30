import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect, test, vi } from "vitest";

const { requireAdminMock, eligibilityMock, summaryMock, revertMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  eligibilityMock: vi.fn(),
  summaryMock: vi.fn(),
  revertMock: vi.fn(),
}));

vi.mock("~/utils/require-admin.server", () => ({ requireAdmin: requireAdminMock }));
vi.mock("~/models/catalog-normalization.server", () => ({
  getCatalogNormalizationRevertEligibility: eligibilityMock,
  getCatalogNormalizationRunSummary: summaryMock,
  revertCatalogNormalizationRun: revertMock,
}));

function actionArgs(intent = "revert") {
  const form = new FormData();
  form.set("intent", intent);
  return {
    request: new Request("https://thermal.test/admin/catalog/normalization/7", {
      method: "POST",
      body: form,
    }),
    params: { runId: "7" },
    context: {},
  } as never;
}

test("normalization loader requires admin and returns run summary with eligibility counts", async () => {
  summaryMock.mockResolvedValueOnce({
    id: 7,
    status: "APPLIED",
    result: { familyCount: 3, sourceCount: 8 },
    createdAt: new Date("2026-08-29T10:00:00.000Z"),
    appliedAt: new Date("2026-08-29T10:01:00.000Z"),
    revertedAt: null,
  });
  eligibilityMock.mockResolvedValueOnce({
    eligible: false,
    postRunQuotationLineCount: 2,
    editedFamilyCount: 1,
  });
  const { loader } = await import("./admin.catalog.normalization.$runId");
  const request = new Request("https://thermal.test/admin/catalog/normalization/7");
  const response = await loader({ request, params: { runId: "7" }, context: {} } as never);

  expect(requireAdminMock).toHaveBeenCalledWith(request);
  expect(eligibilityMock).toHaveBeenCalledWith(7);
  await expect(response.json()).resolves.toEqual({
    runId: 7,
    summary: {
      id: 7,
      status: "APPLIED",
      result: { familyCount: 3, sourceCount: 8 },
      createdAt: "2026-08-29T10:00:00.000Z",
      appliedAt: "2026-08-29T10:01:00.000Z",
      revertedAt: null,
    },
    eligibility: {
      eligible: false,
      postRunQuotationLineCount: 2,
      editedFamilyCount: 1,
    },
  });
});

test("normalization action reports actionable unsafe-revert counts", async () => {
  revertMock.mockResolvedValueOnce({ ok: false, error: "unsafe_revert" });
  eligibilityMock.mockResolvedValueOnce({
    eligible: false,
    postRunQuotationLineCount: 4,
    editedFamilyCount: 3,
  });
  const { action } = await import("./admin.catalog.normalization.$runId");
  const response = await action(actionArgs());

  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toEqual({
    error: "Não é seguro reverter esta execução.",
    postRunQuotationLineCount: 4,
    editedFamilyCount: 3,
  });
});

test("normalization action rejects unknown intents", async () => {
  revertMock.mockClear();
  const { action } = await import("./admin.catalog.normalization.$runId");
  const response = await action(actionArgs("delete"));
  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "Ação inválida" });
  expect(revertMock).not.toHaveBeenCalled();
});

test("normalization detail renders the unsafe warning, counts, catalog link, and disabled revert", async () => {
  const route = await import("./admin.catalog.normalization.$runId");
  const router = createMemoryRouter(
    [
      {
        id: "normalization-run",
        path: "/admin/catalog/normalization/:runId",
        element: <route.default />,
      },
    ],
    {
      initialEntries: ["/admin/catalog/normalization/7"],
      hydrationData: {
        loaderData: {
          "normalization-run": {
            runId: 7,
            summary: {
              id: 7,
              status: "APPLIED",
              result: { familyCount: 3 },
              createdAt: "2026-08-29T10:00:00.000Z",
              appliedAt: "2026-08-29T10:01:00.000Z",
              revertedAt: null,
            },
            eligibility: {
              eligible: false,
              postRunQuotationLineCount: 2,
              editedFamilyCount: 1,
            },
          },
        },
      },
    }
  );

  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const markup = renderToStaticMarkup(<RouterProvider router={router} />);
  consoleError.mockRestore();
  expect(markup).toContain("Resumo da execução");
  expect(markup).toContain("APPLIED");
  expect(markup).toContain("familyCount");
  expect(markup).toContain("Reversão insegura");
  expect(markup).toContain("2 linhas de orçamento");
  expect(markup).toContain('href="/admin/catalog"');
  expect(markup).toMatch(/<button[^>]*disabled[^>]*>Reverter execução<\/button>/);
});
