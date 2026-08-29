import { applyCatalogNormalizationRun } from "~/models/catalog-normalization.server";

const runArgIndex = process.argv.indexOf("--run");
const runId = runArgIndex >= 0 ? Number(process.argv[runArgIndex + 1]) : Number.NaN;

if (!Number.isInteger(runId) || runId <= 0) {
  console.error("Usage: yarn catalogNormalizeApply --run <id>");
  process.exitCode = 1;
} else {
  const result = await applyCatalogNormalizationRun(runId);
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
