import { createHash } from "node:crypto";
import { normalizeGtin } from "../products/gtin";
import type { CatalogIdentityManifest, CatalogIdentitySourceRow } from "./schema";
import type { CatalogIdentityRecord } from "./types";
import { publicCatalogIdentity } from "./public-policy";

export function identitySha256(row: CatalogIdentitySourceRow) {
  // Bind the exact private source record too: altered laboratory/presentation cannot inherit a review.
  return createHash("sha256").update(stableJson([normalizeGtin(row.ean), row.ean, row.name, row.categoryName, row.categorySlug, row.sourceRecord])).digest("hex");
}
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export type CatalogIdentityWrite = Omit<CatalogIdentityRecord, "updatedAt" | "sourceRecord"> & { sourceRecord: CatalogIdentitySourceRow["sourceRecord"] };
export type CatalogIdentityPlanRow = {
  action: "CREATE" | "UPDATE" | "UNCHANGED";
  expectedUpdatedAt: Date | null;
  data: CatalogIdentityWrite;
};

/** Source prices and provenance remain only in sourceRecord, never in a public DTO. */
export function buildCatalogIdentityPlan(manifest: CatalogIdentityManifest, existing: readonly CatalogIdentityRecord[], productGtins: ReadonlySet<string>, tombstones: ReadonlySet<string>, now = new Date()): CatalogIdentityPlanRow[] {
  const currentByGtin = new Map(existing.map(row => [row.gtinCanonical, row]));
  const reviews = new Map(manifest.reviews.map(row => [row.gtinCanonical, row]));
  const snapshotGtins = new Set(manifest.suppressionSnapshot?.gtins ?? []);
  return manifest.rows.map<CatalogIdentityPlanRow>(row => {
    const gtinCanonical = normalizeGtin(row.ean)!;
    const current = currentByGtin.get(gtinCanonical);
    const hash = identitySha256(row);
    const review = reviews.get(gtinCanonical);
    if (review && (review.identitySha256 !== hash || Date.parse(review.reviewedAt) > now.getTime())) throw new Error("Review identity hash or date mismatch.");
    const suppressed = productGtins.has(gtinCanonical) || tombstones.has(gtinCanonical) || snapshotGtins.has(gtinCanonical) || current?.publicState === "SUPPRESSED" || !!current?.suppressedAt;
    const keepReview = current?.identitySha256 === hash && publicCatalogIdentity(current, now) !== null;
    const reviewedAt = review ? new Date(review.reviewedAt) : keepReview ? current!.reviewedAt : null;
    const data: CatalogIdentityWrite = {
      gtinCanonical, ean: row.ean, name: row.name, categoryName: row.categoryName, categorySlug: row.categorySlug,
      identitySha256: hash, sourceFileSha256: manifest.sourceFileSha256, sourceRecord: row.sourceRecord,
      publicState: suppressed ? "SUPPRESSED" : review || keepReview ? "PUBLIC" : "PRIVATE",
      regulatoryStatus: review || keepReview ? "NON_MEDICINE" : "UNKNOWN",
      reviewIdentitySha256: review?.identitySha256 ?? (keepReview ? current!.reviewIdentitySha256 : null),
      reviewedAt, reviewedBy: review?.reviewedBy ?? (keepReview ? current!.reviewedBy : null),
      reviewEvidence: review?.evidence ?? (keepReview ? current!.reviewEvidence : null),
      suppressedAt: suppressed ? current?.suppressedAt ?? now : null,
    };
    const unchanged = current && Object.entries(data).every(([key, value]) => {
      const old = current[key as keyof CatalogIdentityRecord];
      return stableJson(value) === stableJson(old);
    });
    return { action: !current ? "CREATE" : unchanged ? "UNCHANGED" : "UPDATE", expectedUpdatedAt: current?.updatedAt ?? null, data };
  }).sort((a, b) => a.data.gtinCanonical.localeCompare(b.data.gtinCanonical));
}

/** Binds the source, classification decisions and exact database revisions to dry-run approval. */
export function catalogIdentityPlanSha256(plan: readonly CatalogIdentityPlanRow[], suppressionSnapshot?: CatalogIdentityManifest["suppressionSnapshot"]) {
  return createHash("sha256").update(stableJson({ plan: plan.map(row => ({ ...row, data: { ...row.data, suppressedAt: !!row.data.suppressedAt } })), suppressionSnapshot: suppressionSnapshot ?? null })).digest("hex");
}
