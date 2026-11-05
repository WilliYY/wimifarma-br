import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { normalizeGtin } from "../products/gtin";
import { publicCatalogIdentity, type PublicIdentityCandidate } from "./public-policy";
import type { PublicCatalogIdentity } from "./types";

/** A single read statement closes the Product/tombstone race without mutations in GET. */
async function readPublicIdentities(gtinCanonical: string | null): Promise<PublicCatalogIdentity[]> {
  const now = new Date();
  const records = await getPrisma().$queryRaw<PublicIdentityCandidate[]>(Prisma.sql`
    WITH blocked AS (
      SELECT catalog_identity_gtin("ean") AS gtin FROM "Product"
      UNION SELECT catalog_identity_gtin("eanNormalized") FROM "Product"
      UNION SELECT "gtinCanonical" FROM "CatalogIdentitySuppression"
    )
    SELECT c."gtinCanonical", c."ean", c."name", c."categoryName", c."categorySlug",
      c."identitySha256", c."publicState", c."regulatoryStatus", c."reviewIdentitySha256",
      c."reviewedAt", c."reviewedBy", c."reviewEvidence", c."suppressedAt"
    FROM "CatalogIdentity" c
    WHERE c."publicState" = 'PUBLIC' AND c."regulatoryStatus" = 'NON_MEDICINE'
      AND c."suppressedAt" IS NULL AND c."reviewedAt" IS NOT NULL AND c."reviewedAt" <= ${now}
      AND c."reviewIdentitySha256" = c."identitySha256"
      AND c."reviewedBy" IS NOT NULL AND length(btrim(c."reviewedBy")) > 0
      AND c."reviewEvidence" IS NOT NULL AND length(btrim(c."reviewEvidence")) >= 20
      ${gtinCanonical ? Prisma.sql`AND c."gtinCanonical" = ${gtinCanonical}` : Prisma.empty}
      AND NOT EXISTS (SELECT 1 FROM blocked WHERE blocked.gtin = c."gtinCanonical")
    ORDER BY c."name", c."gtinCanonical"
  `);
  return records.flatMap(row => {
    const identity = publicCatalogIdentity(row, now);
    return identity ? [identity] : [];
  });
}

export async function getPublicCatalogIdentities(): Promise<PublicCatalogIdentity[]> {
  return readPublicIdentities(null);
}
export async function getPublicCatalogIdentityByGtin(input: unknown): Promise<PublicCatalogIdentity | null> {
  const canonical = normalizeGtin(input);
  if (!canonical) return null;
  return (await readPublicIdentities(canonical))[0] ?? null;
}
