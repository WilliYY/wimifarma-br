import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { lockProductCatalog } from "../src/features/products/mutations";
import { estimateBaseShipping } from "../src/features/shipping/base-estimate";

// Only the ten presentations explicitly reviewed in this pilot; no category-wide approval.
const pilotEans = ["7896181915638", "7896004708539", "7896422507738", "7896004778204", "7896004706795",
  "7899095236639", "7897595627360", "7896112486787", "7896112486886", "7896181920410"];

async function main() {
  const args = process.argv.slice(2);
  const actorId = args.includes("--actor-id") ? args[args.indexOf("--actor-id") + 1] : undefined;
  if (!actorId) throw new Error("Use --actor-id <active ADMIN> [--apply]. Dry-run is the default.");
  const db = getPrisma();
  try {
    const plans = await db.$transaction(async tx => {
      await lockProductCatalog(tx);
      if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("Active ADMIN required.");
      const products = await tx.product.findMany({ where: { ean: { in: pilotEans } }, orderBy: { id: "asc" } });
      if (products.length !== pilotEans.length) throw new Error("The complete reviewed pilot must exist before estimating shipping.");
      const plans = [];
      for (const selected of products) {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${selected.id} FOR UPDATE`;
        const product = await tx.product.findUnique({ where: { id: selected.id } });
        if (!product || product.deletedAt || product.status !== "ACTIVE" || product.inventorySource !== "DISTRIBUTOR" ||
          !product.requiresPrescription || product.prescriptionType !== "ORDINARY" || product.isPopularPharmacy ||
          !/losartana/i.test(product.name) || !/50\s*mg/i.test(product.name)) throw new Error("Pilot identity or purchase classification changed; manual review required.");
        if (product.shippingProfile !== null) {
          plans.push({ ean: product.ean, action: "PRESERVE_EXISTING_PROFILE" });
          continue;
        }
        const base = estimateBaseShipping(product);
        if (!base || base.family !== "ORAL_SOLID") throw new Error("No eligible oral-solid base; no profile was changed.");
        const profile = base.draft;
        plans.push({ ean: product.ean, action: "SAVE_ESTIMATED_SHIPPING_DRAFT", profile });
        if (!args.includes("--apply")) continue;
        await tx.product.update({ where: { id: product.id }, data: { shippingProfile: profile } });
        await tx.auditLog.create({ data: { action: "SUPPLIER_SHIPPING_BASE_ESTIMATED", entity: "Product", entityId: product.id, userId: actorId,
          metadata: { rule: "oral-solid-base-v1", ean: product.ean, measurementBasis: "estimated", weightGrams: profile.weightGrams,
            widthCm: profile.widthCm, heightCm: profile.heightCm, lengthCm: profile.lengthCm, enabled: false, transportReviewed: false,
            basis: "Base operacional com embalagem/proteção autorizada pelo lojista; sem alegação de medição ou aceitação da carga. Conferir embalagem e restrições da transportadora antes de liberar." } } });
      }
      return plans;
    }, { timeout: 20000 });
    console.log(JSON.stringify({ applied: args.includes("--apply"), products: plans }, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Pilot shipping review failed"); process.exitCode = 1; });
