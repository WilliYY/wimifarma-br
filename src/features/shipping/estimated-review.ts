import { createHash } from "node:crypto";
import { z } from "zod";
import { assessCarrierCargo, isKnownShippingService, shippingCargoKindsSchema } from "./cargo-policy";
import { permittedShippingServices } from "./eligibility";
import { normalizeLogisticsGtin } from "./logistics-evidence";
import { shippingProfileSchema, shippingServiceIdsSchema } from "./schema";
import { validateShippingProduct, type ShippingProduct } from "./rules";

export const ESTIMATED_REVIEW_POLICY = "review-estimated-shipping-v1";
export const estimatedReviewHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const estimatedReviewEntrySchema = z.object({
  productId: z.string().min(1).max(100), expectedEan: z.string().min(8).max(14),
  expectedName: z.string().min(1).max(500), expectedUpdatedAt: z.iso.datetime(),
  expectedShippingProfile: z.record(z.string(), z.unknown()), expectedProfileSha256: estimatedReviewHashSchema,
  cargoKinds: shippingCargoKindsSchema.refine(values => values.length > 0, "Declare a carga explicitamente."),
  approvedServiceIds: shippingServiceIdsSchema.refine(values => values.length > 0 && new Set(values).size === values.length, "Declare serviços distintos."),
}).strict();
export type EstimatedReviewEntry = z.infer<typeof estimatedReviewEntrySchema>;
export const estimatedDraftOnlyEntrySchema = estimatedReviewEntrySchema.omit({ cargoKinds: true, approvedServiceIds: true, expectedShippingProfile: true }).extend({
  action: z.literal("DRAFT_ONLY"), expectedShippingProfile: z.null(),
  draftProfile: z.object({ enabled: z.literal(false), transportReviewed: z.literal(false), measurementBasis: z.literal("estimated"),
    weightGrams: z.literal(300), lengthCm: z.literal(24), widthCm: z.literal(15), heightCm: z.literal(10), reference: z.null(),
    cargoKinds: z.tuple([z.literal("medication")]), approvedServiceIds: z.tuple([]),
  }).strict(),
}).strict();
export type EstimatedReviewProduct = Omit<ShippingProduct, "prescriptionType"> & {
  ean: string | null; eanNormalized: string | null; status: string; deletedAt: Date | null;
  prescriptionType: string;
};

/** Canonical literal snapshot: key order is immaterial; values and unknown keys are bound. */
export function estimatedReviewSha256(value: unknown): string {
  const canonical = (input: unknown): unknown => {
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === "object") return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonical(child)]));
    return input;
  };
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

/** A null-profile hypothesis never approves transport or changes prescription policy. */
export function createEstimatedDraftOnly(product: EstimatedReviewProduct, input: unknown): Record<string, unknown> {
  const entry = estimatedDraftOnlyEntrySchema.parse(input);
  const gtin = normalizeLogisticsGtin(entry.expectedEan);
  if (!gtin || product.id !== entry.productId || product.ean !== entry.expectedEan || product.name !== entry.expectedName ||
    normalizeLogisticsGtin(product.eanNormalized ?? product.ean) !== gtin || product.updatedAt.toISOString() !== entry.expectedUpdatedAt ||
    product.shippingProfile !== null || product.status !== "ACTIVE" || product.deletedAt !== null || entry.expectedProfileSha256 !== estimatedReviewSha256(null)) {
    throw new Error("DRAFT_ONLY exige identidade exata, revisão vigente e perfil inicialmente nulo.");
  }
  shippingProfileSchema.parse({ ...entry.draftProfile, transportReviewed: true });
  return entry.draftProfile;
}

/** Explicit operational review only. It never changes estimates into measurements. */
export function reviewEstimatedShipping(product: EstimatedReviewProduct, input: unknown, configuredServices: number[]): Record<string, unknown> {
  const expected = estimatedReviewEntrySchema.parse(input);
  const gtin = normalizeLogisticsGtin(expected.expectedEan);
  if (!gtin || product.id !== expected.productId || product.ean !== expected.expectedEan || product.name !== expected.expectedName ||
    normalizeLogisticsGtin(product.eanNormalized ?? product.ean) !== gtin || product.updatedAt.toISOString() !== expected.expectedUpdatedAt ||
    estimatedReviewSha256(expected.expectedShippingProfile) !== expected.expectedProfileSha256 ||
    estimatedReviewSha256(product.shippingProfile) !== expected.expectedProfileSha256) throw new Error("Identidade, revisão ou perfil mudou; lote cancelado.");
  const profile = expected.expectedShippingProfile;
  const normalizedCategory = (product.category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const classification = product.catalogClassification;
  const medicine = classification && typeof classification === "object" && "kind" in classification && classification.kind === "MEDICINE";
  if (product.status !== "ACTIVE" || product.deletedAt !== null || product.isPopularPharmacy || product.requiresPrescription ||
    product.prescriptionType !== "UNREVIEWED" || medicine || /medicament|farmaci/.test(normalizedCategory)) throw new Error("Produto fora do lote conservador de mercadorias ativas sem receita.");
  if (profile.enabled !== false || profile.transportReviewed !== false || profile.measurementBasis !== "estimated" || profile.notifyOnlyPendingLogistics === true) {
    throw new Error("Exige estimativa não revisada, desativada e sem bloqueio Avise-me.");
  }
  const blockedCargo = ["unspecified", "medication", "perishable", "temperature_sensitive"];
  if (expected.cargoKinds.some(cargo => blockedCargo.includes(cargo))) throw new Error("Carga exige confirmação externa separada.");
  // Validate the source too: replacing malformed cargo/services must not repair a corrupt profile silently.
  shippingProfileSchema.parse({ ...profile, transportReviewed: true });
  const previousCargo = (profile.cargoKinds ?? []) as string[];
  if (previousCargo.some(cargo => cargo !== "unspecified" && cargo !== "general" && !expected.cargoKinds.some(value => value === cargo))) throw new Error("A revisão não pode remover restrições de carga existentes.");
  const normalizedName = product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if ((/\b(perfume|eau de toilette|deo\s*colonia|body splash)\b/.test(normalizedName) && !expected.cargoKinds.includes("perfume")) ||
    (/\b(aerossol|aerosol)\b/.test(normalizedName) && !expected.cargoKinds.includes("aerosol"))) throw new Error("Declare explicitamente a carga identificada no produto.");
  const previousServices = profile.approvedServiceIds as number[] | undefined;
  if (previousServices?.length && expected.approvedServiceIds.some(service => !previousServices.includes(service))) throw new Error("A revisão não pode ampliar serviços já restritos.");
  const candidate = { ...profile, enabled: true, transportReviewed: true, cargoKinds: expected.cargoKinds, approvedServiceIds: expected.approvedServiceIds };
  shippingProfileSchema.parse(candidate);
  const reviewedProduct = { ...product, prescriptionType: "UNREVIEWED" as const, shippingProfile: candidate };
  validateShippingProduct(reviewedProduct);
  const permitted = permittedShippingServices(configuredServices, [reviewedProduct]);
  if (expected.approvedServiceIds.some(service => !isKnownShippingService(service) || !permitted.includes(service) || assessCarrierCargo(service, expected.cargoKinds).status !== "allowed")) {
    throw new Error("Serviço não configurado, proibido, desconhecido ou condicionado para esta carga.");
  }
  return candidate;
}
