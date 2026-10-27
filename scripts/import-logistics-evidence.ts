import "dotenv/config";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { PrismaClient } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";
import { logisticsEvidenceSchema, mergeLogisticsEvidence, evidenceStatus, normalizeLogisticsGtin } from "../src/features/shipping/logistics-evidence";

const batchSchema = z.array(logisticsEvidenceSchema).min(1).max(5000).refine(items => new Set(items.map(item => item.gtin)).size === items.length, "GTIN repetido no lote.");
export async function importLogisticsEvidence(db: Pick<PrismaClient, "$transaction">, values: unknown, actorId: string, apply: boolean) {
  const entries = batchSchema.parse(values);
  return db.$transaction(async tx => {
    if (!await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) throw new Error("ADMIN ativo obrigatório para importar evidências.");
    const gtins = entries.map(item => item.gtin);
    const rawEans = [...new Set(gtins.flatMap(gtin => [gtin, gtin.slice(-13), gtin.slice(-12), gtin.slice(-8)]))];
    const products = await tx.product.findMany({ where: { deletedAt: null, OR: [{ eanNormalized: { in: gtins } }, { ean: { in: rawEans } }] }, select: { id: true, ean: true, eanNormalized: true, logisticsEvidence: true, updatedAt: true } });
    const plans = [];
    for (const entry of entries) {
      const matches = products.filter(product => normalizeLogisticsGtin(product.eanNormalized ?? product.ean) === entry.gtin);
      if (matches.length !== 1) throw new Error(`GTIN ${entry.gtin}: correspondência ausente ou ambígua; lote não aplicado.`);
      const product = matches[0];
      const merged = mergeLogisticsEvidence(product.logisticsEvidence, entry);
      const previous = logisticsEvidenceSchema.safeParse(product.logisticsEvidence);
      const unchanged = previous.success && JSON.stringify(merged) === JSON.stringify(previous.data);
      plans.push({ productId: product.id, gtin: entry.gtin, status: evidenceStatus(merged), observations: merged.observations.length, action: unchanged ? "PRESERVE_IDENTICAL_EVIDENCE" : "SAVE_EVIDENCE_ONLY" });
      if (!apply || unchanged) continue;
      const result = await tx.product.updateMany({ where: { id: product.id, deletedAt: null, updatedAt: product.updatedAt }, data: { logisticsEvidence: merged } });
      if (result.count !== 1) throw new Error("O produto mudou durante a importação; lote cancelado.");
      await tx.auditLog.create({ data: { userId: actorId, action: "PRODUCT_LOGISTICS_EVIDENCE_IMPORTED", entity: "Product", entityId: product.id, metadata: { gtin: entry.gtin, status: evidenceStatus(merged), sources: merged.observations.map(item => ({ id: item.id, sha256: item.source.sha256 })) } } });
    }
    return { applied: apply, products: plans };
  }, { timeout: 60000 });
}
async function main() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") continue;
    if (["--input", "--actor-id"].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("--")) { i++; continue; }
    throw new Error("Use --input <arquivo JSON privado> --actor-id <ADMIN ativo> [--apply]. Dry-run é o padrão.");
  }
  const input = args[args.indexOf("--input") + 1], actorId = args[args.indexOf("--actor-id") + 1];
  if (!args.includes("--input") || !args.includes("--actor-id") || !input || !actorId) throw new Error("Informe --input e --actor-id. Dry-run é o padrão.");
  if ((await stat(input)).size > 10_000_000) throw new Error("Arquivo excede 10 MB.");
  const values: unknown = JSON.parse(await readFile(input, "utf8"));
  batchSchema.parse(values);
  const db = getPrisma();
  try { console.log(JSON.stringify(await importLogisticsEvidence(db, values, actorId, args.includes("--apply")), null, 2)); }
  finally { await db.$disconnect(); }
}
if (process.argv[1] && resolve(process.argv[1]).endsWith(`${process.platform === "win32" ? "\\" : "/"}import-logistics-evidence.ts`)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Falha na importação física."); process.exitCode = 1; });
}
