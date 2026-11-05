import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogIdentityManifestSchema } from "../src/features/catalog-identities/schema";
import { buildCatalogIdentityPlan, catalogIdentityPlanSha256 } from "../src/features/catalog-identities/import-plan";

/** Offline only. This command never connects to a database or applies a plan. */
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 3 || args[0] !== "--manifest" || args[2] === "--apply") throw new Error("Usage: tsx scripts/prepare-catalog-identities.ts --manifest <normalized-private-manifest.json> <private-plan.json>. Offline preparation only; no apply flag.");
  const inputPath = resolve(args[1]);
  const outputPath = resolve(args[2]);
  if (inputPath === outputPath) throw new Error("Preserve the input manifest; choose another output path.");
  const manifest = catalogIdentityManifestSchema.parse(JSON.parse(await readFile(inputPath, "utf8")));
  const plan = buildCatalogIdentityPlan(manifest, [], new Set(), new Set());
  await writeFile(outputPath, JSON.stringify({ version: 1, mode: "OFFLINE_PREPARATION", databaseValidated: false,
    sourceFileSha256: manifest.sourceFileSha256, planSha256: catalogIdentityPlanSha256(plan, manifest.suppressionSnapshot),
    note: "PRIVATE artifact. Does not establish Product absence, historical GTIN eligibility or permission to apply/publish. Execute a transactional ADMIN dry-run before applying.", plan }, null, 2), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ mode: "OFFLINE_PREPARATION", databaseValidated: false, identities: plan.length,
    reviewCandidates: plan.filter(row => row.data.publicState === "PUBLIC").length, outputPath }));
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Preparation failed."); process.exitCode = 1; });
