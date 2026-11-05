import { Prisma } from "@/generated/prisma/client";
import { lockProductCatalog } from "../products/mutations";
import { normalizeGtin } from "../products/gtin";
import { catalogIdentityManifestSchema } from "./schema";
import { buildCatalogIdentityPlan, catalogIdentityPlanSha256, type CatalogIdentityPlanRow } from "./import-plan";
import type { CatalogIdentityRecord } from "./types";

const BATCH_SIZE = 500;
export type CatalogIdentityImportOptions = { apply?: boolean; expectedPlanSha256?: string; now?: Date };

/** Caller owns a SINGLE transaction (Serializable recommended), timeout and operator authorization.
 * No connection, production grant, endpoint or automatic apply is created by this service.
 */
export async function executeCatalogIdentityImport(tx: Prisma.TransactionClient, input: unknown, actorId: string, options: CatalogIdentityImportOptions = {}) {
  const manifest = catalogIdentityManifestSchema.parse(input);
  const now = options.now ?? new Date();
  if (manifest.suppressionSnapshot && Date.parse(manifest.suppressionSnapshot.observedAt) > now.getTime()) throw new Error("Historical suppression snapshot cannot be in the future.");
  await lockProductCatalog(tx);
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR SHARE`;
  const actor = await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } });
  if (!actor) throw new Error("Active ADMIN actor required.");
  if (manifest.reviews.some(review => review.reviewedBy !== actor.id)) throw new Error("Review actor must be the active ADMIN applying this manifest.");
  const gtins = manifest.rows.map(row => normalizeGtin(row.ean)!);
  const existing: CatalogIdentityRecord[] = [];
  const tombstones = new Set<string>();
  for (let offset = 0; offset < gtins.length; offset += BATCH_SIZE) {
    const batch = gtins.slice(offset, offset + BATCH_SIZE);
    // Advisory lock is acquired before identity rows, following catalog mutation lock order.
    await tx.$queryRaw(Prisma.sql`SELECT "gtinCanonical" FROM "CatalogIdentity" WHERE "gtinCanonical" IN (${Prisma.join(batch)}) ORDER BY "gtinCanonical" FOR UPDATE`);
    existing.push(...await tx.catalogIdentity.findMany({ where: { gtinCanonical: { in: batch } } }));
    for (const row of await tx.catalogIdentitySuppression.findMany({ where: { gtinCanonical: { in: batch } }, select: { gtinCanonical: true } })) tombstones.add(row.gtinCanonical);
  }
  // No status/deletedAt condition: existing, archived and trashed Products all reserve GTINs.
  const products = await tx.product.findMany({ select: { ean: true, eanNormalized: true } });
  const productGtins = new Set(products.flatMap(row => [normalizeGtin(row.ean), normalizeGtin(row.eanNormalized)].filter((gtin): gtin is string => !!gtin)));
  const plan = buildCatalogIdentityPlan(manifest, existing, productGtins, tombstones, now);
  const planSha256 = catalogIdentityPlanSha256(plan, manifest.suppressionSnapshot);
  const coverage = await tx.$queryRaw<{ count: number }[]>`SELECT count(*)::integer AS count FROM "AuditLog"
    WHERE entity = 'Product' AND action = 'PRODUCT_PURGED'
      AND catalog_identity_gtin(metadata->>'ean') IS NULL
      AND catalog_identity_gtin(metadata->>'eanNormalized') IS NULL
      AND catalog_identity_gtin(metadata->'before'->>'ean') IS NULL
      AND catalog_identity_gtin(metadata->'before'->>'eanNormalized') IS NULL`;
  if (options.apply) {
    if (!options.expectedPlanSha256 || options.expectedPlanSha256 !== planSha256) throw new Error("Catalog identity plan changed; run a fresh dry-run.");
    const snapshot = manifest.suppressionSnapshot;
    if (snapshot) {
      let added = 0;
      for (let offset = 0; offset < snapshot.gtins.length; offset += BATCH_SIZE) {
        const batch = snapshot.gtins.slice(offset, offset + BATCH_SIZE);
        added += (await tx.catalogIdentitySuppression.createMany({ data: batch.map(gtinCanonical => ({ gtinCanonical, reason: "PINNED_HISTORICAL_PRODUCT_SNAPSHOT" })), skipDuplicates: true })).count;
      }
      if (added) await tx.auditLog.create({ data: { action: "CATALOG_IDENTITY_HISTORICAL_SUPPRESSIONS", entity: "CatalogIdentitySuppression", userId: actor.id,
        metadata: { planSha256, sourceFileSha256: snapshot.sourceFileSha256, observedAt: snapshot.observedAt, supplied: snapshot.gtins.length, added } } });
    }
    const creates = plan.filter(row => row.action === "CREATE");
    for (let offset = 0; offset < creates.length; offset += BATCH_SIZE) {
      await tx.catalogIdentity.createMany({ data: creates.slice(offset, offset + BATCH_SIZE).map(row => row.data) });
    }
    for (const row of plan.filter(row => row.action === "UPDATE")) {
      const result = await tx.catalogIdentity.updateMany({ where: { gtinCanonical: row.data.gtinCanonical, updatedAt: row.expectedUpdatedAt! }, data: row.data });
      if (result.count !== 1) throw new Error("Catalog identity revision changed; transaction must roll back.");
    }
    if (snapshot) for (let offset = 0; offset < snapshot.gtins.length; offset += BATCH_SIZE) {
      await tx.catalogIdentity.updateMany({ where: { gtinCanonical: { in: snapshot.gtins.slice(offset, offset + BATCH_SIZE) }, suppressedAt: null }, data: { publicState: "SUPPRESSED", suppressedAt: now } });
    }
    const changed = plan.filter(row => row.action !== "UNCHANGED");
    for (let offset = 0; offset < changed.length; offset += BATCH_SIZE) {
      await tx.auditLog.createMany({ data: changed.slice(offset, offset + BATCH_SIZE).map(row => auditData(row, actor.id, planSha256)) });
    }
  }
  return { planSha256, applied: options.apply === true, coverageGap: { legacyPurgeAuditsWithoutGtin: coverage[0]?.count ?? 0 }, counts: {
    create: plan.filter(row => row.action === "CREATE").length,
    update: plan.filter(row => row.action === "UPDATE").length,
    unchanged: plan.filter(row => row.action === "UNCHANGED").length,
    public: plan.filter(row => row.data.publicState === "PUBLIC").length,
    private: plan.filter(row => row.data.publicState === "PRIVATE").length,
    suppressed: plan.filter(row => row.data.publicState === "SUPPRESSED").length,
  }, plan };
}

function auditData(row: CatalogIdentityPlanRow, actorId: string, planSha256: string) {
  return { action: "CATALOG_IDENTITY_IMPORTED", entity: "CatalogIdentity", entityId: row.data.gtinCanonical, userId: actorId,
    metadata: { planSha256, action: row.action, gtinCanonical: row.data.gtinCanonical, sourceFileSha256: row.data.sourceFileSha256,
      identitySha256: row.data.identitySha256, previousUpdatedAt: row.expectedUpdatedAt?.toISOString() ?? null,
      publicState: row.data.publicState, regulatoryStatus: row.data.regulatoryStatus,
      reviewIdentitySha256: row.data.reviewIdentitySha256, reviewedBy: row.data.reviewedBy,
      reviewedAt: row.data.reviewedAt?.toISOString() ?? null, reviewEvidence: row.data.reviewEvidence } };
}
