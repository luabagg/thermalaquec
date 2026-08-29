export function updateEditorRow<T extends { clientKey: string }>(
  rows: T[],
  clientKey: string,
  update: (row: T) => T,
): T[] {
  return rows.map((row) => (row.clientKey === clientKey ? update(row) : row));
}
