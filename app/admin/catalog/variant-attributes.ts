export type VariantAttribute = { name: string; value: string };

/** Reads a variant's `attributes` JSON column. Entries without a name and a value are dropped. */
export function readVariantAttributes(value: unknown): VariantAttribute[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    entry && typeof entry === "object" && "name" in entry && "value" in entry
      ? [{ name: String(entry.name), value: String(entry.value) }]
      : [],
  );
}
