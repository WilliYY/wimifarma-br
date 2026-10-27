import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { PrismaClient } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";
import { lockProductCatalog } from "../src/features/products/mutations";
import { estimateWeightOnly } from "../src/features/shipping/base-estimate";
import { logisticsGtinSchema, normalizeLogisticsGtin } from "../src/features/shipping/logistics-evidence";

const inputSchema = z.array(logisticsGtinSchema).min(1).max(5000)
  .refine(items => new Set(items).size === items.length, "GTIN repetido no lote.");

export async function applyProductWeightDrafts(db: Pick<PrismaClient, "$transaction">, values: unknown, actorId: string, apply: boolean, expectedPlan?: string) {
  const gtins = inputSchema.parse(values);
  if (apply && !/^[a-f0-9]{64}$/.test(expectedPlan ?? "")) throw new Error("Aplicação exige o SHA-256 do dry-run revisado.");
  return db.$transaction(async tx => {
    await lockProductCatalog(tx);
    if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("ADMIN ativo obrigatório.");
    const rawEans = [...new Set(gtins.flatMap(gtin => [gtin, gtin.slice(-13), gtin.slice(-12), gtin.slice(-8)]))];
    const products = await tx.product.findMany({
      where: { status: "ACTIVE", deletedAt: null, OR: [{ eanNormalized: { in: gtins } }, { ean: { in: rawEans } }] },
      select: { id: true, name: true, ean: true, eanNormalized: true, category: true, requiresPrescription: true, prescriptionType: true,
        isPopularPharmacy: true, shippingProfile: true, logisticsEvidence: true, updatedAt: true },
    });
    const plans = gtins.map(gtin => {
      const matches = products.filter(product => normalizeLogisticsGtin(product.eanNormalized ?? product.ean) === gtin);
      if (matches.length !== 1) throw new Error(`GTIN ${gtin}: correspondência ausente ou ambígua; lote cancelado.`);
      const product = matches[0];
      const identity = { productId: product.id, gtin, revision: product.updatedAt.toISOString() };
      if (product.shippingProfile !== null) return { ...identity, action: "PRESERVE_EXISTING_PROFILE" as const, estimate: null };
      const estimate = estimateWeightOnly({ ...product, gtin });
      return { ...identity, action: estimate ? "SAVE_ESTIMATED_WEIGHT_ONLY" as const : "PENDING_PHYSICAL_REVIEW" as const, estimate };
    });
    const planSha256 = createHash("sha256").update(JSON.stringify(plans)).digest("hex");
    if (apply && expectedPlan !== planSha256) throw new Error("Plano mudou desde o dry-run; nenhuma gravação aplicada.");
    for (const plan of plans) {
      if (!apply || plan.action !== "SAVE_ESTIMATED_WEIGHT_ONLY" || !plan.estimate) continue;
      const changed = await tx.product.updateMany({
        where: { id: plan.productId, status: "ACTIVE", deletedAt: null, updatedAt: new Date(plan.revision) },
        data: { shippingProfile: plan.estimate.draft },
      });
      if (changed.count !== 1) throw new Error("Produto mudou durante a aplicação; lote revertido.");
      await tx.auditLog.create({ data: { userId: actorId, action: "PRODUCT_WEIGHT_DRAFT_ESTIMATED", entity: "Product", entityId: plan.productId,
        metadata: { gtin: plan.gtin, planSha256, ...plan.estimate, basis: "Cenário aproximado autorizado, sem medição, dimensões ou aceitação de carga confirmadas." } } });
    }
    return { applied: apply, planSha256, products: plans };
  }, { timeout: 180000 });
}

async function main() {
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--apply") continue;
    if (["--input", "--actor-id", "--expect-plan"].includes(args[index]) && args[index + 1] && !args[index + 1].startsWith("--")) { index++; continue; }
    throw new Error("Use --input <GTINs.json> --actor-id <ADMIN> [--apply --expect-plan <SHA-256>].");
  }
  if (!args.includes("--input") || !args.includes("--actor-id")) throw new Error("Informe --input e --actor-id. Dry-run é o padrão.");
  const input = args[args.indexOf("--input") + 1], actor = args[args.indexOf("--actor-id") + 1];
  if ((await stat(input)).size > 1_000_000) throw new Error("Arquivo excede 1 MB.");
  const values: unknown = JSON.parse(await readFile(input, "utf8"));
  inputSchema.parse(values);
  const db = getPrisma();
  try { console.log(JSON.stringify(await applyProductWeightDrafts(db, values, actor, args.includes("--apply"), args.includes("--expect-plan") ? args[args.indexOf("--expect-plan") + 1] : undefined))); }
  finally { await db.$disconnect(); }
}
if (process.argv[1] && resolve(process.argv[1]).replaceAll("\\", "/").endsWith("/apply-product-weight-drafts.ts")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Falha no lote de pesos."); process.exitCode = 1; });
}
