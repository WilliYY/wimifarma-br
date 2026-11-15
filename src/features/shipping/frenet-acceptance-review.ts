import { z } from "zod";
import { resolveCmedReference } from "@/features/products/cmed-reference";
import { estimatedReviewEntrySchema, estimatedReviewHashSchema, estimatedReviewSha256, type EstimatedReviewProduct } from "./estimated-review";
import { frenetCheckoutServices, frenetPostingLocation } from "./frenet-checkout";
import { logisticsSourceSchema, normalizeLogisticsGtin } from "./logistics-evidence";
import { validateShippingProduct } from "./rules";
import { frenetServiceCodeSchema, shippingProfileSchema, type ShippingSettings } from "./schema";

const serviceEvidenceSchema = z.strictObject({
  serviceCode: frenetServiceCodeSchema,
  reference: z.string().trim().min(1).max(500),
  sourceSha256: estimatedReviewHashSchema,
  verifiedAt: z.iso.datetime(),
});

function distinctServiceEvidence(services: readonly { serviceCode: string }[]) {
  return new Set(services.map(service => service.serviceCode)).size === services.length;
}
const distinctServicesMessage = "Informe cada serviço uma única vez.";
const carrierEvidenceSchema = z.strictObject({
  originPostalCode: z.literal("87525000"),
  postingPoint: z.literal(frenetPostingLocation().pointName),
  productClass: z.literal("cosmetic"),
  nonHazardous: z.literal(true),
  packagingConditions: z.string().trim().min(1).max(1000),
  services: z.array(serviceEvidenceSchema).min(1).max(2).refine(distinctServiceEvidence, distinctServicesMessage),
});

export const frenetAcceptanceReviewEntrySchema = estimatedReviewEntrySchema.extend({
  action: z.literal("REVIEW_FRENET_ACCEPTANCE"),
  cargoKinds: z.tuple([z.literal("liquid")]),
  approvedServiceIds: z.tuple([]),
  carrierEvidence: carrierEvidenceSchema,
}).strict();

export const frenetOrdinaryReviewEntrySchema = frenetAcceptanceReviewEntrySchema.extend({
  action: z.literal("REVIEW_FRENET_ORDINARY"),
  cargoKinds: z.tuple([z.literal("medication")]),
  carrierEvidence: carrierEvidenceSchema.extend({
    productClass: z.literal("ordinary-medicine"),
    presentation: z.string().trim().min(1).max(500),
    presentationGtin: z.string().regex(/^\d{8,14}$/),
    registration: z.string().regex(/^\d{13}$/),
    leafletUrl: logisticsSourceSchema.shape.url,
    leafletSha256: estimatedReviewHashSchema,
    storageConditions: z.string().trim().min(1).max(1000),
    coldChainRequired: z.literal(false),
    services: z.array(serviceEvidenceSchema.extend({
      conservationReference: z.string().trim().min(1).max(500),
      conservationSourceSha256: estimatedReviewHashSchema,
      destinationCoverage: z.literal("all-service-destinations"),
    })).min(1).max(2).refine(distinctServiceEvidence, distinctServicesMessage),
  }),
}).strict();

/** A revisão registra a evidência conferida pelo ADMIN para cada SKU e serviço. */
export function reviewFrenetAcceptance(
  product: EstimatedReviewProduct & { cmedReference?: unknown },
  entry: z.infer<typeof frenetAcceptanceReviewEntrySchema> | z.infer<typeof frenetOrdinaryReviewEntrySchema>,
  settings: ShippingSettings,
): Record<string, unknown> {
  const gtin = normalizeLogisticsGtin(entry.expectedEan);
  if (!gtin || product.id !== entry.productId || product.ean !== entry.expectedEan || product.name !== entry.expectedName ||
    normalizeLogisticsGtin(product.eanNormalized ?? product.ean) !== gtin || product.updatedAt.toISOString() !== entry.expectedUpdatedAt ||
    estimatedReviewSha256(entry.expectedShippingProfile) !== entry.expectedProfileSha256 ||
    estimatedReviewSha256(product.shippingProfile) !== entry.expectedProfileSha256) {
    throw new Error("Identidade, revisão ou perfil mudou; lote cancelado.");
  }
  const classification = product.catalogClassification;
  const kind = classification && typeof classification === "object" && "kind" in classification ? classification.kind : null;
  if (product.status !== "ACTIVE" || product.deletedAt !== null || product.isPopularPharmacy || kind === "FOOD" || kind === "SUPPLEMENT") {
    throw new Error("Produto fora do escopo da revisão Frenet.");
  }
  const ordinary = entry.action === "REVIEW_FRENET_ORDINARY";
  if (ordinary) {
    if (!product.requiresPrescription || product.prescriptionType !== "ORDINARY") {
      throw new Error("A revisão medicinal Frenet exige receita comum classificada.");
    }
    if (normalizeLogisticsGtin(entry.carrierEvidence.presentationGtin) !== gtin) {
      throw new Error("O GTIN da apresentação medicinal diverge da identidade do produto.");
    }
    const cmed = resolveCmedReference(product.cmedReference, gtin);
    if (cmed && cmed.registration.replace(/\D/g, "") !== entry.carrierEvidence.registration) {
      throw new Error("O registro medicinal diverge da referência CMED vigente para o GTIN.");
    }
  } else if (product.requiresPrescription || product.prescriptionType !== "UNREVIEWED" || kind === "MEDICINE") {
    throw new Error("A revisão Frenet exige cosmético ativo fora do atendimento farmacêutico.");
  }
  const profile = entry.expectedShippingProfile;
  if (profile.enabled !== false || profile.transportReviewed !== false ||
    profile.notifyOnlyPendingLogistics === true || Object.hasOwn(profile, "frenetAcceptance")) {
    throw new Error("Exige perfil pendente sem Avise-me ou aceite Frenet anterior.");
  }
  // Substituir a carga ou a lista de serviços não pode encobrir um perfil malformado.
  const source = shippingProfileSchema.parse({ ...profile, transportReviewed: true });
  if (source.approvedServiceIds?.length || source.cargoKinds?.some(cargo => cargo !== "general" && cargo !== "unspecified" && cargo !== entry.cargoKinds[0])) {
    throw new Error("A revisão Frenet não substitui serviços ou restrições de carga já registrados.");
  }
  const normalizedName = product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/ele(?:c)?tric|bateria|pilha|recarreg/.test(normalizedName)) {
    throw new Error("Produto elétrico exige revisão separada de transporte.");
  }
  if (/\b(?:oxidantes?|descolorantes?|peroxido)\b/.test(normalizedName)) {
    throw new Error("A composição identificada exige revisão separada de transporte.");
  }
  const { services } = entry.carrierEvidence;
  if (services.some(service => Date.parse(service.verifiedAt) > Date.now())) {
    throw new Error("A evidência Frenet tem data de conferência futura.");
  }
  const serviceCodes = services.map(service => service.serviceCode);
  const frenetAcceptance = ordinary
    ? { version: 2, scope: "ordinary-medicine", serviceCodes, destinationCoverage: "all-service-destinations",
      product: { id: product.id, name: product.name, gtin } }
    : { version: 1, serviceCodes };
  const candidate = { ...profile, enabled: true, transportReviewed: true, cargoKinds: entry.cargoKinds,
    approvedServiceIds: entry.approvedServiceIds, frenetAcceptance };
  const reviewedProduct = { ...product, prescriptionType: ordinary ? "ORDINARY" as const : "UNREVIEWED" as const, shippingProfile: candidate };
  validateShippingProduct(reviewedProduct);
  const eligible = frenetCheckoutServices(settings, [reviewedProduct]);
  if (serviceCodes.some(code => !eligible.includes(code))) {
    throw new Error("Produto ou serviço incompatível com a cotação Frenet na origem aprovada.");
  }
  return candidate;
}
