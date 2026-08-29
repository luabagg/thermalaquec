import {
  getCatalogNormalizationRevertEligibility,
  revertCatalogNormalizationRun,
} from "~/models/catalog-normalization.server";

const runArgIndex = process.argv.indexOf("--run");
const runId = runArgIndex >= 0 ? Number(process.argv[runArgIndex + 1]) : Number.NaN;

if (!Number.isInteger(runId) || runId <= 0) {
  console.error("Usage: yarn catalogNormalizeRevert --run <id>");
  process.exitCode = 1;
} else {
  const eligibility = await getCatalogNormalizationRevertEligibility(runId);
  console.log(JSON.stringify({ eligibility }));

  if ("error" in eligibility) {
    process.exitCode = 1;
  } else if (!eligibility.eligible) {
    process.exitCode = 1;
  } else {
    const result = await revertCatalogNormalizationRun(runId);
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  }
}
