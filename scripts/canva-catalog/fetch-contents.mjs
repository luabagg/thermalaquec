/**
 * Report which designs still need content dumps.
 * Fill gaps via Canva MCP get-design-content → raw/contents/{id}.txt
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RAW = path.join(ROOT, "data/quotations/raw");
const CONTENTS = path.join(RAW, "contents");

const designs = JSON.parse(fs.readFileSync(path.join(RAW, "designs.json"), "utf8"));
const have = new Set(fs.readdirSync(CONTENTS).filter((f) => f.endsWith(".txt")).map((f) => f.replace(/\.txt$/, "")));
const missing = designs.filter((d) => !have.has(d.id) && !/^contrato /i.test(d.title));

console.log(`have ${have.size} / ${designs.length}`);
console.log(`missing ${missing.length}`);
missing.slice(0, 30).forEach((d) => console.log(d.id, d.title));
if (missing.length > 30) console.log(`… +${missing.length - 30} more`);
