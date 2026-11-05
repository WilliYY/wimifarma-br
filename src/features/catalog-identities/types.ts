/** Consultation identities deliberately have no sale, stock, freight or supplier fields. */
export type PublicCatalogIdentity = {
  kind: "CONSULTATION";
  id: `catalog:${string}`;
  gtinCanonical: string;
  ean: string;
  name: string;
  categoryName: string | null;
  categorySlug: string | null;
  href: `/catalogo/item/${string}`;
};

export type CatalogIdentityRecord = {
  gtinCanonical: string;
  ean: string;
  name: string;
  categoryName: string | null;
  categorySlug: string | null;
  identitySha256: string;
  publicState: "PRIVATE" | "PUBLIC" | "SUPPRESSED";
  regulatoryStatus: "UNKNOWN" | "NON_MEDICINE";
  reviewIdentitySha256: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewEvidence: string | null;
  suppressedAt: Date | null;
  sourceFileSha256: string;
  sourceRecord: unknown;
  updatedAt: Date;
};
