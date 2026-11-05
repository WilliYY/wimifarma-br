import { z } from "zod";
import { normalizeGtin } from "../products/gtin";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const gtin = z.string().trim().refine(value => normalizeGtin(value) !== null, "Invalid GTIN.");
const rowSchema = z.object({
  ean: gtin,
  name: z.string().trim().min(3).max(250),
  categoryName: z.string().trim().min(1).max(100).nullable(),
  categorySlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).nullable(),
  sourceRecord: z.record(z.string(), z.json()),
}).strict();
const reviewSchema = z.object({
  gtinCanonical: z.string().regex(/^\d{14}$/).refine(value => normalizeGtin(value) === value),
  identitySha256: sha256,
  regulatoryStatus: z.literal("NON_MEDICINE"),
  medicine: z.literal(false),
  nbcal: z.literal(false),
  evidence: z.string().trim().min(20).max(4000),
  reviewedAt: z.iso.datetime({ offset: true }),
  reviewedBy: z.string().trim().min(1).max(200),
}).strict();

export const catalogIdentityManifestSchema = z.object({
  version: z.literal(1), sourceFileSha256: sha256,
  rows: z.array(rowSchema).min(1).max(20000),
  reviews: z.array(reviewSchema).max(20000).default([]),
  suppressionSnapshot: z.object({ sourceFileSha256: sha256, observedAt: z.iso.datetime({ offset: true }),
    gtins: z.array(gtin.transform(value => normalizeGtin(value)!)).max(20000),
  }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  const seen = new Set<string>();
  value.rows.forEach((row, index) => {
    const canonical = normalizeGtin(row.ean)!;
    if (seen.has(canonical)) ctx.addIssue({ code: "custom", path: ["rows", index, "ean"], message: "Duplicate canonical GTIN." });
    seen.add(canonical);
  });
  const reviewed = new Set<string>();
  if (value.suppressionSnapshot && new Set(value.suppressionSnapshot.gtins).size !== value.suppressionSnapshot.gtins.length) ctx.addIssue({ code: "custom", path: ["suppressionSnapshot", "gtins"], message: "Duplicate canonical GTIN in historical suppression snapshot." });
  value.reviews.forEach((review, index) => {
    if (!seen.has(review.gtinCanonical) || reviewed.has(review.gtinCanonical)) ctx.addIssue({ code: "custom", path: ["reviews", index], message: "Review requires one unique source identity." });
    reviewed.add(review.gtinCanonical);
  });
});
export type CatalogIdentityManifest = z.infer<typeof catalogIdentityManifestSchema>;
export type CatalogIdentitySourceRow = CatalogIdentityManifest["rows"][number];
