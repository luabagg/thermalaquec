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

/** Reads the attributes textarea: "Capacidade: 400L" per line, split at the first colon. Other lines are ignored. */
export function parseAttributeText(text: string): VariantAttribute[] {
  return text.split(/\n/).flatMap((line) => {
    const colon = line.indexOf(":");
    const name = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    return colon > 0 && name && value ? [{ name, value }] : [];
  });
}

/** The attributes textarea text for a stored `attributes` column. */
export function formatAttributeText(value: unknown) {
  return readVariantAttributes(value)
    .map((attribute) => `${attribute.name}: ${attribute.value}`)
    .join("\n");
}
