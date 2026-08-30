import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect, test, vi } from "vitest";

const { requireAdminMock, getCatalogFamilyDetailMock, updateCatalogFamilyAggregateMock, archiveCatalogFamilyMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCatalogFamilyDetailMock: vi.fn(),
  updateCatalogFamilyAggregateMock: vi.fn(),
  archiveCatalogFamilyMock: vi.fn(),
}));

vi.mock("~/utils/require-admin.server", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("~/models/catalog.server", () => ({
  getCatalogFamilyDetail: getCatalogFamilyDetailMock,
  updateCatalogFamilyAggregate: updateCatalogFamilyAggregateMock,
  archiveCatalogFamily: archiveCatalogFamilyMock,
  restoreCatalogFamily: vi.fn(),
}));

const familyDetail = {
  id: 1,
  slug: "boiler",
  name: "Boiler",
  nameTemplate: null,
  descriptionLines: ["Base line"],
  defaultUnitPriceCents: 10000,
  imageId: null,
  archivedAt: null,
  createdAt: new Date("2026-08-29T00:00:00.000Z"),
  updatedAt: new Date("2026-08-29T00:00:00.000Z"),
  Image: null,
  options: [
    {
      id: 2,
      name: "Capacidade",
      slug: "capacidade",
      placement: "TITLE" as const,
      sortOrder: 0,
      catalogItemId: 1,
      createdAt: new Date("2026-08-29T00:00:00.000Z"),
      updatedAt: new Date("2026-08-29T00:00:00.000Z"),
      values: [
        {
          id: 3,
          label: "400 L",
          slug: "400-l",
          titleFragment: "400 L",
          descriptionLines: [],
          sortOrder: 0,
          optionId: 2,
          createdAt: new Date("2026-08-29T00:00:00.000Z"),
          updatedAt: new Date("2026-08-29T00:00:00.000Z"),
        },
        {
          id: 5,
          label: "600 L",
          slug: "600-l",
          titleFragment: "600 L",
          descriptionLines: [],
          sortOrder: 1,
          optionId: 2,
          createdAt: new Date("2026-08-29T00:00:00.000Z"),
          updatedAt: new Date("2026-08-29T00:00:00.000Z"),
        },
      ],
    },
  ],
  variants: [
    {
      id: 4,
      key: "3",
      sku: null,
      active: true,
      nameOverride: null,
      descriptionLinesOverride: null,
      unitPriceCents: null,
      imageId: null,
      catalogItemId: 1,
      createdAt: new Date("2026-08-29T00:00:00.000Z"),
      updatedAt: new Date("2026-08-29T00:00:00.000Z"),
      values: [{ optionValueId: 3, variantId: 4 }],
    },
  ],
  aliases: [{ id: 10, originalName: "Boiler old", normalizedKey: "boiler-old", sourceSlug: "boiler-old", sourceMetadata: null }],
  sourceMaps: [
    {
      id: 20,
      runId: 7,
      canonicalCatalogItemId: 1,
      priceDisposition: "KEEP",
      imageDisposition: "KEEP",
      canonicalUpdatedAt: new Date("2026-08-29T00:00:00.000Z"),
    },
  ],
  canonicalMaps: [],
};

function actionArgs(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return {
    request: new Request("https://thermal.test/admin/catalog/1", { method: "POST", body: form }),
    params: { id: "1" },
    context: {},
  } as never;
}

test("loader requires admin and returns 404 when missing", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  getCatalogFamilyDetailMock.mockResolvedValueOnce(null);

  const { loader } = await import("./admin.catalog.$id");
  await expect(
    loader({ request: new Request("https://thermal.test/admin/catalog/1"), params: { id: "1" }, context: {} } as never)
  ).rejects.toMatchObject({ status: 404 });
});

test("loader returns family detail for admin", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  getCatalogFamilyDetailMock.mockResolvedValueOnce(familyDetail);

  const { loader } = await import("./admin.catalog.$id");
  const response = await loader({
    request: new Request("https://thermal.test/admin/catalog/1"),
    params: { id: "1" },
    context: {},
  } as never);

  expect(requireAdminMock).toHaveBeenCalled();
  await expect(response.json()).resolves.toMatchObject({ item: { id: 1, name: "Boiler" } });
});

test("save parses aggregate JSON with expectedUpdatedAt", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  updateCatalogFamilyAggregateMock.mockResolvedValueOnce({ ok: true, item: familyDetail });

  const aggregate = JSON.stringify({
    id: 1,
    expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
    family: {
      slug: "boiler",
      name: "Boiler",
      nameTemplate: null,
      descriptionLines: ["Base line"],
      defaultUnitPriceCents: 10000,
      imageId: null,
    },
    options: [
      {
        id: 2,
        clientKey: "option-2",
        name: "Capacidade",
        slug: "capacidade",
        placement: "TITLE",
        sortOrder: 0,
        values: [
          {
            id: 3,
            clientKey: "value-3",
            label: "400 L",
            slug: "400-l",
            titleFragment: "400 L",
            descriptionLines: [],
            sortOrder: 0,
          },
        ],
      },
    ],
    variants: [],
  });

  const { action } = await import("./admin.catalog.$id");
  const response = await action(actionArgs({ intent: "save", aggregate }));

  expect(response.status).toBe(200);
  expect(updateCatalogFamilyAggregateMock).toHaveBeenCalledWith(
    expect.objectContaining({ id: 1, expectedUpdatedAt: "2026-08-29T00:00:00.000Z" })
  );
});

test("save returns field-level Portuguese errors for invalid aggregate", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  updateCatalogFamilyAggregateMock.mockResolvedValueOnce({
    ok: false,
    error: "invalid",
    fields: { options: "Cannot remove values referenced by retained variants" },
  });

  const aggregate = JSON.stringify({
    id: 1,
    expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
    family: familyDetail,
    options: [],
    variants: [
      {
        id: 4,
        clientKey: "variant-4",
        valueClientKeys: ["value-3"],
        sku: null,
        active: true,
        nameOverride: null,
        descriptionLinesOverride: null,
        unitPriceCents: null,
        imageId: null,
      },
    ],
  });

  const { action } = await import("./admin.catalog.$id");
  const response = await action(actionArgs({ intent: "save", aggregate }));

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: "Revise os campos destacados.",
    fields: { options: "Remova também as combinações que usam os valores excluídos." },
  });
});

test("save reports stale edits with Portuguese message", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  updateCatalogFamilyAggregateMock.mockResolvedValueOnce({ ok: false, error: "stale" });

  const aggregate = JSON.stringify({
    id: 1,
    expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
    family: { slug: "boiler", name: "Boiler", nameTemplate: null, descriptionLines: [], defaultUnitPriceCents: null, imageId: null },
    options: [],
    variants: [],
  });

  const { action } = await import("./admin.catalog.$id");
  const response = await action(actionArgs({ intent: "save", aggregate }));

  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toEqual({
    error: "Este produto foi alterado em outra aba. Recarregue e tente novamente.",
  });
});

test("explicit variant removal plus value removal succeeds", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  updateCatalogFamilyAggregateMock.mockResolvedValueOnce({ ok: true, item: familyDetail });

  const aggregate = JSON.stringify({
    id: 1,
    expectedUpdatedAt: "2026-08-29T00:00:00.000Z",
    family: {
      slug: "boiler",
      name: "Boiler",
      nameTemplate: null,
      descriptionLines: [],
      defaultUnitPriceCents: null,
      imageId: null,
    },
    options: [
      {
        id: 2,
        clientKey: "option-2",
        name: "Capacidade",
        slug: "capacidade",
        placement: "TITLE",
        sortOrder: 0,
        values: [
          {
            id: 3,
            clientKey: "value-3",
            label: "400 L",
            slug: "400-l",
            titleFragment: "400 L",
            descriptionLines: [],
            sortOrder: 0,
          },
        ],
      },
    ],
    variants: [],
  });

  const { action } = await import("./admin.catalog.$id");
  const response = await action(actionArgs({ intent: "save", aggregate }));

  expect(response.status).toBe(200);
  expect(updateCatalogFamilyAggregateMock).toHaveBeenCalledWith(
    expect.objectContaining({ variants: [], options: [expect.objectContaining({ values: [expect.objectContaining({ id: 3 })] })] })
  );
});

test("preview assigns stable synthetic IDs to unsaved values and computes variant keys locally", async () => {
  const { buildPreviewModel, detailToEditorState } = await import("./admin.catalog.$id");
  const state = detailToEditorState(familyDetail as never);
  state.options[0].values.push({
    clientKey: "value-new-1",
    label: "800 L",
    slug: "800-l",
    titleFragment: "800 L",
    descriptionLines: [],
    sortOrder: 2,
  });
  state.variants = [
    {
      clientKey: "variant-new-1",
      valueClientKeys: ["value-new-1"],
      sku: "NEW",
      active: true,
      nameOverride: "Boiler novo",
      descriptionLinesOverride: null,
      unitPriceCents: null,
      imageId: null,
    },
  ];

  const first = buildPreviewModel(state);
  const second = buildPreviewModel(state);
  const syntheticId = first.valueIdByClientKey.get("value-new-1")!;

  expect(syntheticId).toBeLessThan(0);
  expect(second.valueIdByClientKey.get("value-new-1")).toBe(syntheticId);
  expect(first.family.variants[0].key).toBe(String(syntheticId));
  expect(first.family.variants[0].valueIds).toEqual([syntheticId]);
  const { resolveCatalogSelection } = await import("~/utils/catalog-resolver");
  expect(resolveCatalogSelection(first.family, [syntheticId])).toMatchObject({
    ok: true,
    value: { name: "Boiler novo" },
  });
  expect(state.options[0].values[2].id).toBeUndefined();
});

test("adding correction rows retains existing IDs and assigns supplied client keys", async () => {
  const { appendEditorOption, appendEditorValue, appendEditorVariant, detailToEditorState } = await import("./admin.catalog.$id");
  const state = detailToEditorState(familyDetail as never);

  const withOption = appendEditorOption(state, "option-new-1");
  const withValue = appendEditorValue(withOption, "option-new-1", "value-new-1");
  const withVariant = appendEditorVariant(withValue, "variant-new-1");

  expect(withVariant.options[0]).toMatchObject({ id: 2, clientKey: "option-2" });
  expect(withVariant.options[1]).toMatchObject({ clientKey: "option-new-1", id: undefined });
  expect(withVariant.options[1].values[0]).toMatchObject({ clientKey: "value-new-1", id: undefined });
  expect(withVariant.variants.at(-1)).toMatchObject({ clientKey: "variant-new-1", active: true, id: undefined });
});

test("destructive removal retains unrelated IDs and removes affected combinations", async () => {
  const { applyEditorRemoval, detailToEditorState } = await import("./admin.catalog.$id");
  const state = detailToEditorState(familyDetail as never);

  const next = applyEditorRemoval(state, {
    kind: "value",
    optionClientKey: "option-2",
    valueClientKey: "value-3",
    label: "400 L",
    affectedVariantClientKeys: ["variant-4"],
  });

  expect(next.options[0]).toMatchObject({ id: 2, clientKey: "option-2" });
  expect(next.options[0].values).toEqual([expect.objectContaining({ id: 5, clientKey: "value-5" })]);
  expect(next.variants).toEqual([]);
});

test("renders correction controls, provenance warning, and functional confirmation affordance", async () => {
  const route = await import("./admin.catalog.$id");
  const editorState = route.detailToEditorState(familyDetail as never);
  const router = createMemoryRouter(
    [
      {
        id: "catalog-editor",
        path: "/admin/catalog/:id",
        element: <route.default />,
      },
    ],
    {
      initialEntries: ["/admin/catalog/1"],
      hydrationData: { loaderData: { "catalog-editor": { item: familyDetail, editorState } } },
    }
  );

  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const markup = renderToStaticMarkup(<RouterProvider router={router} />);
  consoleError.mockRestore();
  expect(markup).toContain("Adicionar opção");
  expect(markup).toContain("Remover valor");
  expect(markup).toContain("Adicionar combinação");
  expect(markup).toContain("Pré-visualização ao vivo");
  expect(markup).toContain('id="catalog-base-image"');
  expect(markup).toContain("clique em Salvar alterações para associá-la");
  expect(markup).toContain("reversão insegura");
  expect(markup).toContain("/admin/catalog/normalization/7");

  const confirmation = renderToStaticMarkup(
    <route.DestructiveRemovalConfirmation
      removal={{
        kind: "value",
        optionClientKey: "option-2",
        valueClientKey: "value-3",
        label: "400 L",
        affectedVariantClientKeys: ["variant-4"],
      }}
      confirmed={false}
      onConfirmedChange={() => undefined}
      onConfirm={() => undefined}
      onCancel={() => undefined}
    />
  );
  expect(confirmation).toContain('id="confirm-destructive"');
  expect(confirmation).toContain('for="confirm-destructive"');
  expect(confirmation).toContain("Esta remoção também excluirá 1 combinação");
  expect(confirmation).toMatch(/Confirmar remoção<\/button>/);
  expect(confirmation).toContain("disabled");
});

test("archive uses expectedUpdatedAt", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1" } });
  archiveCatalogFamilyMock.mockResolvedValueOnce({ ok: true, item: familyDetail });

  const { action } = await import("./admin.catalog.$id");
  const response = await action(actionArgs({ intent: "archive", expectedUpdatedAt: "2026-08-29T00:00:00.000Z" }));

  expect(response.status).toBe(200);
  expect(archiveCatalogFamilyMock).toHaveBeenCalledWith(1, "2026-08-29T00:00:00.000Z");
});
