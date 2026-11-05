import { normalizeGtin } from "../products/gtin";
import type { CatalogIdentityRecord, PublicCatalogIdentity } from "./types";

export type PublicIdentityCandidate = Omit<CatalogIdentityRecord, "sourceRecord" | "sourceFileSha256" | "updatedAt">;
export function publicCatalogIdentity(row: PublicIdentityCandidate, now = new Date()): PublicCatalogIdentity | null {
  if (row.publicState !== "PUBLIC" || row.regulatoryStatus !== "NON_MEDICINE" || row.suppressedAt ||
    !row.reviewedAt || !Number.isFinite(row.reviewedAt.getTime()) || row.reviewedAt.getTime() > now.getTime() || !row.reviewedBy?.trim() ||
    !row.reviewEvidence || row.reviewEvidence.trim().length < 20 || !/^[a-f0-9]{64}$/.test(row.identitySha256) ||
    row.reviewIdentitySha256 !== row.identitySha256 || normalizeGtin(row.ean) !== row.gtinCanonical) return null;
  return { kind: "CONSULTATION", id: `catalog:${row.gtinCanonical}`, gtinCanonical: row.gtinCanonical,
    ean: row.ean, name: row.name, categoryName: row.categoryName, categorySlug: row.categorySlug,
    href: `/catalogo/item/${row.ean}` };
}
