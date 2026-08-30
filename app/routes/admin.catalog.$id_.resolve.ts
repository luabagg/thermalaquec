import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { getCatalogFamilyDetail } from "~/models/catalog.server";
import { parseIntegerArray, toCatalogFamilyInput } from "~/utils/catalog-admin";
import {
  createCatalogSelectionToken,
  requireCatalogSelectionSecret,
} from "~/utils/catalog-selection-token.server";
import { resolveCatalogSelection, type CatalogResolutionError } from "~/utils/catalog-resolver";
import { requireAdmin } from "~/utils/require-admin.server";

async function requireActiveCatalogFamily(idParam: string) {
  const id = Number(idParam);
  if (!Number.isFinite(id)) throw new Response("Not Found", { status: 404 });
  const item = await getCatalogFamilyDetail(id);
  if (!item || item.archivedAt) throw new Response("Not Found", { status: 404 });
  return item;
}

function catalogResolutionErrorResponse(error: CatalogResolutionError) {
  const status = error === "unknown_combination" ? 409 : 400;
  return json({ error }, { status });
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const item = await requireActiveCatalogFamily(params.id!);
  return json({ family: toCatalogFamilyInput(item) });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const item = await requireActiveCatalogFamily(params.id!);
  let body: { selectedValueIds?: unknown };
  try {
    body = (await request.json()) as { selectedValueIds?: unknown };
  } catch {
    return json({ error: "invalid_request" }, { status: 400 });
  }
  const family = toCatalogFamilyInput(item);
  const selectedValueIds = parseIntegerArray(body.selectedValueIds);
  const result = resolveCatalogSelection(family, selectedValueIds);
  if (!result.ok) return catalogResolutionErrorResponse(result.error);

  const tokenPayload = {
    version: 1 as const,
    catalogItemId: item.id,
    issuedAt: new Date().toISOString(),
    selectionSnapshot: result.value.selectionSnapshot,
  };

  return json({
    draft: {
      ...result.value,
      catalogResolutionToken: createCatalogSelectionToken(tokenPayload, requireCatalogSelectionSecret()),
    },
  });
};
