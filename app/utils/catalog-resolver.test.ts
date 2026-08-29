import { describe, expect, it } from "vitest";

import {
  catalogVariantKey,
  resolveCatalogSelection,
  type CatalogFamilyInput,
} from "./catalog-resolver";

const boiler: CatalogFamilyInput = {
  id: 10,
  slug: "boiler",
  name: "Boiler",
  nameTemplate: "{name} {capacity} {material}",
  descriptionLines: ["Isolamento térmico", "Capacidade: 400 litros"],
  defaultUnitPriceCents: 800_000,
  imageId: 7,
  options: [
    {
      id: 1,
      name: "Capacity",
      slug: "capacity",
      placement: "TITLE",
      sortOrder: 0,
      values: [
        { id: 11, label: "400 L", slug: "400-l", titleFragment: null, descriptionLines: [], sortOrder: 0 },
      ],
    },
    {
      id: 2,
      name: "Material",
      slug: "material",
      placement: "TITLE",
      sortOrder: 1,
      values: [
        { id: 21, label: "AISI 316", slug: "aisi-316", titleFragment: "Inox 316", descriptionLines: [], sortOrder: 0 },
      ],
    },
    {
      id: 3,
      name: "Voltage",
      slug: "voltage",
      placement: "DESCRIPTION",
      sortOrder: 2,
      values: [
        { id: 31, label: "220 V", slug: "220-v", titleFragment: null, descriptionLines: [], sortOrder: 0 },
      ],
    },
  ],
  variants: [],
};

describe("resolveCatalogSelection", () => {
  it("composes title axes, description axes, and a readable snapshot", () => {
    const result = resolveCatalogSelection(boiler, [11, 21, 31]);
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Boiler 400 L Inox 316",
        descriptionLines: ["Isolamento térmico", "Capacidade: 400 litros", "Voltage: 220 V"],
        unitPriceCents: 800_000,
        imageId: 7,
        variantId: null,
        selectionSnapshot: [
          { optionSlug: "capacity", optionLabel: "Capacity", valueSlug: "400-l", valueLabel: "400 L" },
          { optionSlug: "material", optionLabel: "Material", valueSlug: "aisi-316", valueLabel: "AISI 316" },
          { optionSlug: "voltage", optionLabel: "Voltage", valueSlug: "220-v", valueLabel: "220 V" },
        ],
      },
    });
  });

  it("rejects incomplete, duplicate-axis, unknown, and unavailable selections", () => {
    expect(resolveCatalogSelection(boiler, [11, 21])).toEqual({ ok: false, error: "missing_option" });
    expect(resolveCatalogSelection(boiler, [11, 11, 21, 31])).toEqual({ ok: false, error: "duplicate_option" });
    expect(resolveCatalogSelection(boiler, [11, 21, 999])).toEqual({ ok: false, error: "unknown_value" });
  });

  it("creates stable keys independent of submitted order", () => {
    expect(catalogVariantKey([31, 11, 21])).toBe("11|21|31");
  });

  it("allows only active explicit variants and applies absolute overrides", () => {
    const family: CatalogFamilyInput = {
      ...boiler,
      variants: [
        {
          id: 40,
          key: "11|21|31",
          active: true,
          valueIds: [11, 21, 31],
          nameOverride: "Boiler especial",
          descriptionLinesOverride: ["Especificação exclusiva"],
          unitPriceCents: 900_000,
          imageId: 8,
        },
      ],
    };

    expect(resolveCatalogSelection(family, [31, 21, 11])).toEqual({
      ok: true,
      value: {
        name: "Boiler especial",
        descriptionLines: ["Especificação exclusiva"],
        unitPriceCents: 900_000,
        imageId: 8,
        variantId: 40,
        selectionSnapshot: [
          { optionSlug: "capacity", optionLabel: "Capacity", valueSlug: "400-l", valueLabel: "400 L" },
          { optionSlug: "material", optionLabel: "Material", valueSlug: "aisi-316", valueLabel: "AISI 316" },
          { optionSlug: "voltage", optionLabel: "Voltage", valueSlug: "220-v", valueLabel: "220 V" },
        ],
      },
    });

    expect(resolveCatalogSelection({ ...family, variants: [{ ...family.variants[0], active: false }] }, [11, 21, 31])).toEqual({
      ok: false,
      error: "unknown_combination",
    });
  });

  it("uses parent price and image when an explicit variant has no override", () => {
    const family: CatalogFamilyInput = {
      ...boiler,
      variants: [
        {
          id: 40,
          key: "11|21|31",
          active: true,
          valueIds: [11, 21, 31],
          nameOverride: null,
          descriptionLinesOverride: null,
          unitPriceCents: null,
          imageId: null,
        },
      ],
    };

    expect(resolveCatalogSelection(family, [11, 21, 31])).toMatchObject({
      ok: true,
      value: { unitPriceCents: 800_000, imageId: 7, variantId: 40 },
    });
  });

  it("uses title fragments, explicit description lines, and normalized deduplication", () => {
    const family: CatalogFamilyInput = {
      ...boiler,
      nameTemplate: null,
      descriptionLines: ["  Tensão: 220 V  ", "Isolamento térmico"],
      options: boiler.options.map((option) =>
        option.id === 3
          ? {
              ...option,
              values: [{ ...option.values[0], descriptionLines: ["Tensão: 220 V", "Proteção IP65"] }],
            }
          : option,
      ),
    };

    expect(resolveCatalogSelection(family, [11, 21, 31])).toMatchObject({
      ok: true,
      value: {
        name: "Boiler 400 L Inox 316",
        descriptionLines: ["  Tensão: 220 V  ", "Isolamento térmico", "Proteção IP65"],
      },
    });
  });

  it("rejects templates with unknown or malformed placeholders", () => {
    expect(resolveCatalogSelection({ ...boiler, nameTemplate: "{name} {model}" }, [11, 21, 31])).toEqual({
      ok: false,
      error: "invalid_template",
    });
    expect(resolveCatalogSelection({ ...boiler, nameTemplate: "{name} {capacity" }, [11, 21, 31])).toEqual({
      ok: false,
      error: "invalid_template",
    });
  });
});
