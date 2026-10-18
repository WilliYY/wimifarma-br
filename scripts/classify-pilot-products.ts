import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { normalizeGtin } from "../src/features/supplier-catalog/commerce";
import { readClassification } from "../src/features/products/catalog-operations";
import { updateCatalogOperations } from "../src/features/products/catalog-operations-service";
import { lockProductCatalog } from "../src/features/products/mutations";

// Exact presentations verified in the official worksheet, never inferred by brand.
const rows = [
  ["7896181915638", "Biosintética", "GENERIC", 30, 18057],
  ["7896004708539", "Germed", "GENERIC", 30, 18066],
  ["7896422507738", "Medley", "GENERIC", 30, 18116],
  ["7896004778204", "Nova Química", "GENERIC", 30, 18090],
  ["7896004706795", "EMS", "GENERIC", 30, 18046],
  ["7899095236639", "Geolab", "GENERIC", 30, 18105],
  ["7897595627360", "Sandoz", "GENERIC", 30, 18044],
  ["7896112486787", "Aradois", "SIMILAR", 30, 18070],
  ["7896112486886", "Aradois", "SIMILAR", 60, 18071],
  ["7896181920410", "Corus", "SIMILAR", 30, 18061],
] as const;
const source = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file";
const sha256 = "5febea16f9d08f2dbdcf15e954a05b762a7650e834d050c4d57b2dcb4b448fa3";

async function main() {
  const args = process.argv.slice(2);
  const actorId = args.includes("--actor-id") ? args[args.indexOf("--actor-id") + 1] : undefined;
  if (!actorId) throw new Error("Use --actor-id <active ADMIN> [--apply]; dry-run is the default.");
  const apply = args.includes("--apply");
  const db = getPrisma();
  try {
    const result = await db.$transaction(async tx => {
      await lockProductCatalog(tx);
      const actor = await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } });
      if (!actor) throw new Error("Active ADMIN required.");
      const plans = [];
      for (const [ean, identity, medicineClass, quantity, row] of rows) {
        const product = await tx.product.findUnique({ where: { eanNormalized: normalizeGtin(ean)! } });
        if (!product || product.deletedAt || product.inventorySource !== "DISTRIBUTOR" || !product.requiresPrescription || product.prescriptionType !== "ORDINARY" ||
          !product.name.includes(identity) || !/50\s*mg/i.test(product.name) || !new RegExp(`\\b${quantity}\\s+comprimidos`, "i").test(product.name)) throw new Error(`Presentation mismatch: ${ean}.`);
        const classification = { kind: "MEDICINE" as const, medicineClass, ethical: false, otc: false };
        const existing = readClassification(product.catalogClassification);
        if (JSON.stringify(existing) === JSON.stringify(classification)) { plans.push({ ean, action: "UNCHANGED" }); continue; }
        if (existing.kind !== "UNCLASSIFIED") throw new Error(`Preserve manual classification: ${ean}.`);
        plans.push({ ean, action: "CLASSIFY", medicineClass, row });
        if (!apply) continue;
        await updateCatalogOperations(tx, product.id, { expectedUpdatedAt: product.updatedAt.toISOString(), catalogClassification: classification }, actor.id);
        await tx.auditLog.create({ data: { action: "PRODUCT_CLASSIFICATION_VERIFIED", entity: "Product", entityId: product.id, userId: actor.id,
          metadata: { ean, source, sha256, worksheet: "Lista PMC", column: "L", row, observedAt: "2026-10-18", medicineClass } } });
      }
      return plans;
    }, { timeout: 20000 });
    console.log(JSON.stringify({ applied: apply, products: result }, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Classification failed"); process.exitCode = 1; });
