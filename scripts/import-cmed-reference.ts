import "dotenv/config";
import { readFile } from "node:fs/promises";
import { getPrisma } from "../src/lib/prisma";
import { cmedImportManifestSchema, executeCmedImport } from "../src/features/products/cmed-import";
import { lockProductCatalog } from "../src/features/products/mutations";

async function main() {
  const args = process.argv.slice(2);
  const options = new Map<string, string>();
  let apply = false;
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === "--apply" && !apply) { apply = true; continue; }
    if (!["--file", "--actor-id"].includes(key) || options.has(key) || !args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error("Use --file <manifest.json> --actor-id <ADMIN> [--apply]. Dry-run is the default.");
    }
    options.set(key, args[++index]);
  }
  const file = options.get("--file"), actorId = options.get("--actor-id");
  if (!file || !actorId?.trim()) throw new Error("Use --file <manifest.json> --actor-id <ADMIN> [--apply]. Dry-run is the default.");
  const manifest = cmedImportManifestSchema.parse(JSON.parse(await readFile(file, "utf8")));
  const db = getPrisma();
  try {
    const plans = await db.$transaction(tx => executeCmedImport({
      lockCatalog: () => lockProductCatalog(tx),
      $queryRaw: (strings, ...values) => tx.$queryRaw(strings, ...values),
      user: { findFirst: input => tx.user.findFirst(input) },
      product: { findUnique: input => tx.product.findUnique(input), update: input => tx.product.update(input) },
      auditLog: { create: input => tx.auditLog.create(input) },
    }, manifest, actorId, apply), { timeout: 60_000 });
    console.log(JSON.stringify({ applied: apply, products: plans }, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "CMED import failed"); process.exitCode = 1; });
