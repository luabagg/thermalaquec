/** The non-blank lines of a textarea, trimmed. */
export function splitTextLines(text: string) {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Like `splitTextLines`, and also drops a leading "-" or "•" the user typed as a bullet marker. */
export function splitBulletText(text: string | null | undefined) {
  if (!text?.trim()) return [];
  return text
    .split(/\n/)
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);
}

/** Reads a JSON column that holds a list of strings. A plain string counts as a list of one. */
export function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}
