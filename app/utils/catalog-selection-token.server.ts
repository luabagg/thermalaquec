import { createHmac, timingSafeEqual } from "node:crypto";

import type { CatalogSelectionSnapshotEntry } from "~/utils/catalog-resolver";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export type CatalogSelectionTokenPayload = {
  version: 1;
  catalogItemId: number;
  issuedAt: string;
  selectionSnapshot: CatalogSelectionSnapshotEntry[];
};

function parseCatalogSelectionTokenPayload(value: unknown): CatalogSelectionTokenPayload {
  if (!value || typeof value !== "object") throw new Error("invalid_catalog_selection_token");
  const body = value as Record<string, unknown>;
  if (body.version !== 1) throw new Error("invalid_catalog_selection_token");
  const catalogItemId = Number(body.catalogItemId);
  if (!Number.isFinite(catalogItemId)) throw new Error("invalid_catalog_selection_token");
  const issuedAt = String(body.issuedAt ?? "");
  if (!issuedAt || Number.isNaN(Date.parse(issuedAt))) throw new Error("invalid_catalog_selection_token");
  if (!Array.isArray(body.selectionSnapshot)) throw new Error("invalid_catalog_selection_token");
  const selectionSnapshot = body.selectionSnapshot.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("invalid_catalog_selection_token");
    const row = entry as Record<string, unknown>;
    return {
      optionSlug: String(row.optionSlug ?? ""),
      optionLabel: String(row.optionLabel ?? ""),
      valueSlug: String(row.valueSlug ?? ""),
      valueLabel: String(row.valueLabel ?? ""),
    };
  });
  return { version: 1, catalogItemId, issuedAt, selectionSnapshot };
}

export function requireCatalogSelectionSecret() {
  const secret = process.env.CATALOG_SELECTION_SECRET?.trim();
  if (!secret) {
    throw new Response("CATALOG_SELECTION_SECRET is not configured", { status: 500 });
  }
  return secret;
}

export function createCatalogSelectionToken(payload: CatalogSelectionTokenPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyCatalogSelectionToken(token: string, secret: string, now = new Date()) {
  const segments = token.split(".");
  if (segments.length !== 2) throw new Error("invalid_catalog_selection_token");
  const [body, signature] = segments;
  if (!body || !signature) throw new Error("invalid_catalog_selection_token");
  const expected = createHmac("sha256", secret).update(body).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("invalid_catalog_selection_token");
  }
  const payload = parseCatalogSelectionTokenPayload(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  const ageMs = now.getTime() - Date.parse(payload.issuedAt);
  if (ageMs > MAX_AGE_MS) throw new Error("expired_catalog_selection_token");
  if (ageMs < -MAX_FUTURE_SKEW_MS) throw new Error("invalid_catalog_selection_token");
  return payload;
}
