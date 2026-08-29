import { describe, expect, it } from "vitest";
import {
  CATALOG_NORMALIZATION_SCHEMA_VERSION,
  digestCatalogSource,
  validateCatalogProposal,
  type CatalogNormalizationProposal,
  type CatalogNormalizationSourceSnapshot,
} from "./catalog-normalization-contract";

const source: CatalogNormalizationSourceSnapshot = {
  schemaVersion: 1,
  exportedAt: "2026-08-29T00:00:00.000Z",
  items: [
    { id: 1, slug: "boiler-400", name: "Boiler 400L", descriptionLines: [], defaultUnitPriceCents: 100, imageId: null },
    { id: 2, slug: "boiler-600", name: "Boiler 600 L", descriptionLines: [], defaultUnitPriceCents: 200, imageId: null },
  ],
};

function proposal(): CatalogNormalizationProposal {
  return {
    schemaVersion: CATALOG_NORMALIZATION_SCHEMA_VERSION,
    sourceSnapshotDigest: digestCatalogSource(source),
    algorithmVersion: "agent-v1",
    families: [{
      clientKey: "boiler", slug: "boiler", name: "Boiler", nameTemplate: "{name} {capacity}", descriptionLines: [],
      parentPriceSourceId: 1, parentImageSourceId: 1,
      options: [{ clientKey: "capacity", name: "Capacidade", slug: "capacity", placement: "TITLE", values: [
        { clientKey: "400-l", label: "400 L", slug: "400-l", titleFragment: null, descriptionLines: [] },
        { clientKey: "600-l", label: "600 L", slug: "600-l", titleFragment: null, descriptionLines: [] },
      ] }],
      variants: [
        { clientKey: "400", valueClientKeys: ["capacity:400-l"], sku: "BOILER-400", active: true, nameOverride: null, descriptionLinesOverride: null, unitPriceCents: 100, imageSourceId: null },
        { clientKey: "600", valueClientKeys: ["capacity:600-l"], sku: "BOILER-600", active: true, nameOverride: null, descriptionLinesOverride: null, unitPriceCents: 200, imageSourceId: null },
      ],
      sources: [
        { sourceId: 1, alias: "Boiler 400L", selectedValueClientKeys: ["capacity:400-l"], priceDisposition: "PARENT_SOURCE", imageDisposition: "PARENT_SOURCE" },
        { sourceId: 2, alias: "Boiler 600 L", selectedValueClientKeys: ["capacity:600-l"], priceDisposition: "VARIANT", imageDisposition: "USE_PARENT_FALLBACK" },
      ],
    }],
  };
}

function errorsFor(mutator: (value: CatalogNormalizationProposal) => void) {
  const value = proposal();
  mutator(value);
  const result = validateCatalogProposal(source, value);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors;
}

describe("validateCatalogProposal", () => {
  it("accepts complete digest-bound source coverage", () => {
    expect(validateCatalogProposal(source, proposal())).toEqual({ ok: true });
  });

  it("rejects stale digest, duplicate/missing sources, and undeclared price differences", () => {
    const stale = proposal();
    stale.sourceSnapshotDigest = "stale";
    expect(validateCatalogProposal(source, stale)).toMatchObject({ ok: false, errors: [{ code: "stale_source_digest" }] });

    expect(errorsFor((value) => { value.families[0].sources = [value.families[0].sources[0]]; }))
      .toEqual(expect.arrayContaining([{ code: "missing_source", path: "source:2", message: expect.any(String) }]));

    expect(errorsFor((value) => { value.families[0].sources[1].priceDisposition = "PARENT_SOURCE"; }))
      .toEqual(expect.arrayContaining([{ code: "price_disposition_mismatch", path: "family:boiler/source:2", message: expect.any(String) }]));
  });

  it("requires unique family, option, value, alias, and SKU keys", () => {
    expect(errorsFor((value) => { value.families.push({ ...value.families[0], clientKey: "boiler" }); }))
      .toEqual(expect.arrayContaining([{ code: "duplicate_family_key", path: "family:boiler", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].options.push({ ...value.families[0].options[0], clientKey: "capacity-2" }); }))
      .toEqual(expect.arrayContaining([{ code: "duplicate_option_slug", path: "family:boiler/option:capacity-2", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].options[0].values.push({ ...value.families[0].options[0].values[0], clientKey: "400-l-copy" }); }))
      .toEqual(expect.arrayContaining([{ code: "duplicate_value_slug", path: "family:boiler/option:capacity/value:400-l-copy", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].sources[1].alias = "Bôiler!! 400L"; }))
      .toEqual(expect.arrayContaining([{ code: "duplicate_alias", path: "family:boiler/source:2", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].variants[1].sku = "BOILER-400"; }))
      .toEqual(expect.arrayContaining([{ code: "duplicate_sku", path: "family:boiler/variant:600", message: expect.any(String) }]));
  });

  it("rejects invalid field lengths", () => {
    expect(errorsFor((value) => { value.algorithmVersion = "a".repeat(101); }))
      .toEqual(expect.arrayContaining([{ code: "invalid_field_length", path: "proposal.algorithmVersion", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].nameTemplate = "a".repeat(301); }))
      .toEqual(expect.arrayContaining([{ code: "invalid_field_length", path: "family:boiler/nameTemplate", message: expect.any(String) }]));
  });

  it("rejects invalid deserialized disposition values", () => {
    const deserialized = JSON.parse(JSON.stringify(proposal())) as CatalogNormalizationProposal;
    const mappedSource = deserialized.families[0].sources[1];
    mappedSource.priceDisposition = "INVALID" as unknown as typeof mappedSource.priceDisposition;
    mappedSource.imageDisposition = "INVALID" as unknown as typeof mappedSource.imageDisposition;

    expect(validateCatalogProposal(source, deserialized)).toEqual(expect.objectContaining({
      ok: false,
      errors: expect.arrayContaining([
        { code: "invalid_price_disposition", path: "family:boiler/source:2", message: expect.any(String) },
        { code: "invalid_image_disposition", path: "family:boiler/source:2", message: expect.any(String) },
      ]),
    }));
  });

  it("rejects invalid variant axes, sources, prices, templates, parent membership, and image dispositions", () => {
    expect(errorsFor((value) => {
      const otherFamily = { ...value.families[0], clientKey: "heater", slug: "heater", sources: [], variants: [], options: [{
        ...value.families[0].options[0], clientKey: "heater-capacity",
      }] };
      value.families.push(otherFamily);
      value.families[0].variants[0].valueClientKeys = ["heater-capacity:400-l"];
    })).toEqual(expect.arrayContaining([{ code: "unknown_value_reference", path: "family:boiler/variant:400", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].variants[0].valueClientKeys = ["capacity:400-l", "capacity:600-l"]; }))
      .toEqual(expect.arrayContaining([{ code: "invalid_variant_axis_selection", path: "family:boiler/variant:400", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].variants[0].unitPriceCents = -1; }))
      .toEqual(expect.arrayContaining([{ code: "invalid_price", path: "family:boiler/variant:400", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].nameTemplate = "{unknown}"; }))
      .toEqual(expect.arrayContaining([{ code: "invalid_template_placeholder", path: "family:boiler", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].parentPriceSourceId = 99; }))
      .toEqual(expect.arrayContaining([{ code: "parent_source_not_member", path: "family:boiler/parentPriceSourceId", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].sources[1].imageDisposition = "PARENT_SOURCE"; }))
      .toEqual(expect.arrayContaining([{ code: "image_disposition_mismatch", path: "family:boiler/source:2", message: expect.any(String) }]));
    expect(errorsFor((value) => { value.families[0].sources[1].sourceId = 99; }))
      .toEqual(expect.arrayContaining([{ code: "unknown_source", path: "source:99", message: expect.any(String) }]));
  });
});

describe("digestCatalogSource", () => {
  it("is independent of export time and item order", () => {
    expect(digestCatalogSource({ ...source, exportedAt: "2026-08-30T00:00:00.000Z", items: [...source.items].reverse() }))
      .toBe(digestCatalogSource(source));
  });
});
