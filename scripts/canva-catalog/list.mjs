/**
 * Inventory helper (documentation + offline merge).
 * Live inventory is produced via Canva MCP `list-folder-items` on folder FAFOUXOmKmU
 * and written to data/quotations/raw/designs.json.
 *
 * Expected record shape:
 * { id, title, pageCount, createdAt, updatedAt }
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "data/quotations/raw/designs.json");

const designs = JSON.parse(fs.readFileSync(OUT, "utf8"));
console.log(`${designs.length} designs in ${OUT}`);
