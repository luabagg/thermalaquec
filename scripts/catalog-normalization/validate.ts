import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { validateAndRecordCatalogProposal } from "~/models/catalog-normalization.server";
import { digestCatalogSource, type CatalogNormalizationProposal, type CatalogNormalizationSourceSnapshot, type CatalogProposalError } from "~/utils/catalog-normalization-contract";

const sourcePath = resolve("data/catalog-normalization/source.json");
const proposalPath = resolve("data/catalog-normalization/proposal.json");
const validationPath = resolve("data/catalog-normalization/validation.json");

type InputResult<T> = { ok: true; value: T } | { ok: false; errors: CatalogProposalError[] };

async function readJson<T>(path: string, label: string): Promise<InputResult<T>> {
  try {
    return { ok: true, value: JSON.parse(await readFile(path, "utf8")) as T };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing_input" : "invalid_json";
    return { ok: false, errors: [{ code, path: label, message: `${label} is ${code === "missing_input" ? "missing" : "not valid JSON"}.` }] };
  }
}

const [sourceResult, proposalResult] = await Promise.all([
  readJson<CatalogNormalizationSourceSnapshot>(sourcePath, "source"),
  readJson<CatalogNormalizationProposal>(proposalPath, "proposal"),
]);
if (!sourceResult.ok || !proposalResult.ok) {
  const errors = [
    ...(sourceResult.ok ? [] : sourceResult.errors),
    ...(proposalResult.ok ? [] : proposalResult.errors),
  ];
  await writeFile(validationPath, `${JSON.stringify({ ok: false, errors }, null, 2)}\n`);
  console.log(JSON.stringify({ errors }));
  process.exitCode = 1;
} else {
  let result: Awaited<ReturnType<typeof validateAndRecordCatalogProposal>>;
  try {
    result = await validateAndRecordCatalogProposal({ source: sourceResult.value, proposal: proposalResult.value });
  } catch {
    result = { ok: false, errors: [{ code: "validation_failed", path: "proposal", message: "Proposal could not be validated." }] };
  }
  await writeFile(validationPath, `${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) {
    console.log(JSON.stringify({ errors: result.errors }));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({
      digest: digestCatalogSource(sourceResult.value),
      itemCount: sourceResult.value.items.length,
      familyCount: proposalResult.value.families.length,
      sourceCount: proposalResult.value.families.reduce((count, family) => count + family.sources.length, 0),
      runId: result.runId,
    }));
  }
}
