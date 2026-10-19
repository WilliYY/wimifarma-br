import { z } from "zod";
import { catalogClassificationSchema, classificationIsConsistent, supplierMarkupSchema } from "../products/catalog-operations";
import { shippingDraftSchema } from "../shipping/product-draft";
import { normalizeGtin } from "./commerce";
import { SupplierCatalogOfferSchema } from "./schema";

// References are retained in private audit records; credentials must never enter them.
export const importSourceSchema = z.url().max(2000).refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.hash &&
    ![...url.searchParams.keys()].some(key => /token|secret|password|credential|authorization|api.?key|signature/i.test(key));
}, "Use a credential-free HTTPS source.");
const evidenceSchema = z.object({ sourceUrl: importSourceSchema, observedAt: z.iso.datetime({ offset: true }) }).strict();
const gtinSchema = z.string().refine(value => normalizeGtin(value) !== null, "Invalid GTIN.");
const { productId: _productId, eanNormalized: _ean, ...offerFields } = SupplierCatalogOfferSchema.shape;
void [_productId, _ean];
const offerSchema = z.object({ ...offerFields,
  sourceUrl: importSourceSchema.nullable().optional(),
}).strict().refine(offer => {
  const duration = Date.parse(offer.validUntil) - Date.parse(offer.observedAt);
  return duration > 0 && duration <= 86_400_000;
}, "Offer validity must be positive and up to 24 hours.");
const rowSchema = z.object({
  ean: gtinSchema,
  name: z.string().trim().min(5).max(160), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  brand: z.string().trim().min(1).max(120), description: z.string().trim().min(80).max(800),
  category: z.string().trim().min(1).max(100), activeIngredients: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  prescriptionType: z.enum(["ORDINARY", "NONE"]), requiresPrescription: z.boolean(),
  catalogClassification: catalogClassificationSchema.optional(), supplierMarkupBps: supplierMarkupSchema.optional(),
  evidence: z.object({ identity: evidenceSchema, classification: evidenceSchema }).strict().optional(),
  shippingProfile: shippingDraftSchema.extend({ measurementBasis: z.literal("estimated") }).strict().optional(),
  offers: z.array(offerSchema).min(1).max(2),
  internalImage: z.object({ filePath: z.string().min(1).max(2000), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
    sourceUrl: importSourceSchema, ean: gtinSchema }).strict().optional(),
}).strict();

export const supplierImportManifestSchema = z.object({ manifestVersion: z.literal(1).optional(), products: z.array(rowSchema).min(1).max(50) }).strict()
  .superRefine((input, ctx) => {
    const seen = new Set<string>();
    input.products.forEach((row, index) => {
      const issue = (message: string) => ctx.addIssue({ code: "custom", path: ["products", index], message });
      const gtin = normalizeGtin(row.ean)!;
      if (seen.has(gtin)) issue("Duplicate GTIN in import file.");
      seen.add(gtin);
      if (row.requiresPrescription !== (row.prescriptionType === "ORDINARY")) issue("Explicit prescription flags must agree.");
      if (row.requiresPrescription && (row.activeIngredients.length === 0 || row.offers.some(offer => offer.retailCeilingCents === null))) issue("Prescription entries require active ingredients and verified retail ceilings.");
      if (new Set(row.offers.map(offer => offer.supplier)).size !== row.offers.length) issue("Duplicate supplier offer.");
      if (row.offers.some(offer => offer.replenishAllocation)) issue("Routine imports cannot replenish allocation.");
      if (input.manifestVersion === 1) {
        if (!row.evidence || !row.catalogClassification || row.supplierMarkupBps === undefined) issue("Mixed manifests require explicit evidence, classification and markup for every EAN.");
        if (row.offers.some(offer => !offer.sourceUrl)) issue("Mixed offers require source evidence.");
      } else if (!row.requiresPrescription || row.prescriptionType !== "ORDINARY" || row.evidence || row.catalogClassification || row.shippingProfile || row.supplierMarkupBps !== undefined) {
        issue("Use manifestVersion 1 for explicit mixed imports; legacy imports are prescription-only.");
      }
      const classification = row.catalogClassification;
      if (classification && (!["MEDICINE", "HYGIENE", "PERFUMERY"].includes(classification.kind) ||
        (classification.kind === "MEDICINE" && (classification.medicineClass === "UNCLASSIFIED" || (!row.requiresPrescription && !classification.otc))) ||
        !classificationIsConsistent(classification, { requiresPrescription: row.requiresPrescription, prescriptionType: persistedPrescriptionType(row), isPopularPharmacy: false }))) issue("Unsupported or inconsistent catalog classification.");
      if (row.evidence && Object.values(row.evidence).some(item => Date.parse(item.observedAt) > Date.now())) issue("Evidence must already have been observed.");
      const checkSources = (value: unknown): void => {
        if (!value || typeof value !== "object") return;
        for (const [key, item] of Object.entries(value)) {
          if ((key === "url" || key === "sourceUrl") && typeof item === "string" && !importSourceSchema.safeParse(item).success) issue("Shipping references must use credential-free HTTPS sources.");
          else if (item && typeof item === "object") checkSources(item);
        }
      };
      checkSources(row.shippingProfile);
      if (row.internalImage && (!row.requiresPrescription || normalizeGtin(row.internalImage.ean) !== gtin)) issue("Internal images require the exact ordinary-prescription presentation.");
    });
  }).transform(input => ({ ...input, products: input.products.map(row => ({ ...row, supplierMarkupBps: row.supplierMarkupBps ?? 6000 })) }));

export type SupplierImportRow = z.infer<typeof supplierImportManifestSchema>["products"][number];

/** NONE is manifest-only: existing storage uses UNREVIEWED together with requiresPrescription=false. */
export function persistedPrescriptionType(row: { requiresPrescription: boolean }): "ORDINARY" | "UNREVIEWED" {
  return row.requiresPrescription ? "ORDINARY" : "UNREVIEWED";
}

export function assertImportTarget(row: SupplierImportRow, current: {
  inventorySource: string; deletedAt: Date | null; name: string; brand: string | null;
  ean: string | null; eanNormalized?: string | null;
  requiresPrescription: boolean; prescriptionType: string; isPopularPharmacy: boolean;
}) {
  if (current.deletedAt || current.inventorySource !== "DISTRIBUTOR") throw new Error("EAN exists outside the supplier pilot; preserve the physical product and review manually.");
  if (normalizeGtin(current.eanNormalized ?? current.ean ?? "") !== normalizeGtin(row.ean) ||
    current.name !== row.name || current.brand !== row.brand || current.requiresPrescription !== row.requiresPrescription ||
    current.prescriptionType !== persistedPrescriptionType(row) || current.isPopularPharmacy) throw new Error("Identity or prescription mismatch; manual review required.");
}
