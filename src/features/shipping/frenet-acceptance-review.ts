import { z } from "zod";
import { estimatedReviewEntrySchema, estimatedReviewHashSchema, estimatedReviewSha256, type EstimatedReviewProduct } from "./estimated-review";
import { frenetCheckoutServices, frenetPostingLocation } from "./frenet-checkout";
import { normalizeLogisticsGtin } from "./logistics-evidence";
import { validateShippingProduct } from "./rules";
import { frenetServiceCodeSchema, shippingProfileSchema, type ShippingSettings } from "./schema";

const serviceEvidenceSchema = z.strictObject({
  serviceCode: frenetServiceCodeSchema,
  reference: z.string().trim().min(1).max(500),
  sourceSha256: estimatedReviewHashSchema,
  verifiedAt: z.iso.datetime(),
});

export const frenetAcceptanceReviewEntrySchema = estimatedReviewEntrySchema.extend({
  action: z.literal("REVIEW_FRENET_ACCEPTANCE"),
  cargoKinds: z.tuple([z.literal("liquid")]),
  approvedServiceIds: z.tuple([]),
  carrierEvidence: z.strictObject({
    originPostalCode: z.literal("87525000"),
    postingPoint: z.literal(frenetPostingLocation().pointName),
    productClass: z.literal("cosmetic"),
    nonHazardous: z.literal(true),
    packagingConditions: z.string().trim().min(1).max(1000),
    services: z.array(serviceEvidenceSchema).min(1).max(2)
      .refine(services => new Set(services.map(service => service.serviceCode)).size === services.length, "Informe cada serviço uma única vez."),
  }),
}).strict();

/** A revisão registra a evidência conferida pelo ADMIN para cada SKU e serviço. */
export function reviewFrenetAcceptance(
  product: EstimatedReviewProduct,
  entry: z.infer<typeof frenetAcceptanceReviewEntrySchema>,
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
  if (product.status !== "ACTIVE" || product.deletedAt !== null || product.isPopularPharmacy ||
    product.requiresPrescription || product.prescriptionType !== "UNREVIEWED" ||
    kind === "MEDICINE" || kind === "FOOD" || kind === "SUPPLEMENT") {
    throw new Error("A revisão Frenet exige cosmético ativo fora do atendimento farmacêutico.");
  }
  const profile = entry.expectedShippingProfile;
  if (profile.enabled !== false || profile.transportReviewed !== false ||
    profile.notifyOnlyPendingLogistics === true || Object.hasOwn(profile, "frenetAcceptance")) {
    throw new Error("Exige perfil pendente sem Avise-me ou aceite Frenet anterior.");
  }
  // Substituir a carga ou a lista de serviços não pode encobrir um perfil malformado.
  const source = shippingProfileSchema.parse({ ...profile, transportReviewed: true });
  if (source.approvedServiceIds?.length || source.cargoKinds?.some(cargo => !["general", "unspecified", "liquid"].includes(cargo))) {
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
  const candidate = { ...profile, enabled: true, transportReviewed: true, cargoKinds: entry.cargoKinds,
    approvedServiceIds: entry.approvedServiceIds, frenetAcceptance: { version: 1, serviceCodes } };
  const reviewedProduct = { ...product, prescriptionType: "UNREVIEWED" as const, shippingProfile: candidate };
  validateShippingProduct(reviewedProduct);
  const eligible = frenetCheckoutServices(settings, [reviewedProduct]);
  if (serviceCodes.some(code => !eligible.includes(code))) {
    throw new Error("Produto ou serviço incompatível com a cotação Frenet na origem aprovada.");
  }
  return candidate;
}
