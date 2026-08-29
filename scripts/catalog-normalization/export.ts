import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { exportCatalogNormalizationSource } from "~/models/catalog-normalization.server";
import { digestCatalogSource } from "~/utils/catalog-normalization-contract";

const sourcePath = resolve("data/catalog-normalization/source.json");

const source = await exportCatalogNormalizationSource();
await mkdir(dirname(sourcePath), { recursive: true });
await writeFile(sourcePath, `${JSON.stringify(source, null, 2)}\n`);

console.log(JSON.stringify({
  digest: digestCatalogSource(source),
  itemCount: source.items.length,
}));
