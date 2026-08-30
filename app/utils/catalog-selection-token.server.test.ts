import { describe, expect, it } from "vitest";

import { createCatalogSelectionToken, verifyCatalogSelectionToken } from "./catalog-selection-token.server";

const payload = {
  version: 1 as const,
  catalogItemId: 10,
  issuedAt: "2026-08-29T00:00:00.000Z",
  selectionSnapshot: [
    { optionSlug: "capacity", optionLabel: "Capacidade", valueSlug: "400-l", valueLabel: "400 L" },
  ],
};

describe("catalog selection tokens", () => {
  it("round-trips a server snapshot", () => {
    const token = createCatalogSelectionToken(payload, "test-secret");
    expect(verifyCatalogSelectionToken(token, "test-secret", new Date("2026-08-30T00:00:00.000Z"))).toEqual(payload);
  });

  it("rejects tampering, extra segments, wrong secrets, old tokens, and future timestamps", () => {
    const token = createCatalogSelectionToken(payload, "test-secret");
    expect(() => verifyCatalogSelectionToken(`${token}x`, "test-secret")).toThrow("invalid_catalog_selection_token");
    expect(() => verifyCatalogSelectionToken(`${token}.extra`, "test-secret")).toThrow("invalid_catalog_selection_token");
    expect(() => verifyCatalogSelectionToken(token, "wrong-secret")).toThrow("invalid_catalog_selection_token");
    expect(() => verifyCatalogSelectionToken(token, "test-secret", new Date("2026-09-06T00:00:00.000Z"))).toThrow(
      "expired_catalog_selection_token",
    );
    expect(() => verifyCatalogSelectionToken(token, "test-secret", new Date("2026-08-28T23:54:59.000Z"))).toThrow(
      "invalid_catalog_selection_token",
    );
  });
});
