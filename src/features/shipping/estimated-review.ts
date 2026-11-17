import { createHash } from "node:crypto";
import { z } from "zod";
import { classificationIsConsistent, readClassification } from "../products/catalog-operations";
import { assessCarrierCargo, isKnownShippingService, shippingCargoKindsSchema } from "./cargo-policy";
import { hasPerfumeShippingCargo, permittedShippingServices } from "./eligibility";
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
const officialLeafletHosts = new Set([
  "consultas.anvisa.gov.br", "althaia.com.br", "bula.ache.com.br", "www.ache.com.br",
  "cdn.biolabfarma.com.br", "eurofarma.com.br", "produtos.apsen.com.br", "www.abbottbrasil.com.br",
  "www.fqmgrupo.com.br", "www.geolab.com.br", "www.lbaldacci.com.br", "www.libbs.com.br", "www.torrent.com.br",
]);
const ordinaryMedicineEvidenceSchema = z.object({
  carrierCaseId: z.literal("2100064"),
  presentation: z.string().max(500).refine(value => value.trim().length > 0),
  registration: z.string().regex(/^[1-9]\d{12}$/),
  leafletUrl: z.url().max(1500).refine(value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && officialLeafletHosts.has(url.hostname) &&
        !url.username && !url.password && !url.port && url.pathname !== "/";
    } catch { return false; }
  }, "Informe a URL HTTPS da bula oficial do fabricante ou da Anvisa."),
  minTemperatureC: z.number().max(15),
  maxTemperatureC: z.number().min(30),
  originalPackaging: z.literal(true),
  refrigerationRequired: z.literal(false),
  protectFromLight: z.boolean().optional(),
  protectFromMoisture: z.boolean().optional(),
}).strict();
export const estimatedOrdinaryMedicineEntrySchema = estimatedReviewEntrySchema.extend({
  action: z.literal("REVIEW_MELHOR_ENVIO_ORDINARY"),
  cargoKinds: z.tuple([z.literal("medication")]),
  approvedServiceIds: z.array(z.union([z.literal(1), z.literal(2)])).min(1).max(2)
    .refine(values => new Set(values).size === values.length, "Declare serviços distintos."),
  ordinaryMedicineEvidence: ordinaryMedicineEvidenceSchema,
}).strict();
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

function verifyEstimatedSnapshot(product: EstimatedReviewProduct, expected: EstimatedReviewEntry) {
  const gtin = normalizeLogisticsGtin(expected.expectedEan);
  if (!gtin || product.id !== expected.productId || product.ean !== expected.expectedEan || product.name !== expected.expectedName ||
    normalizeLogisticsGtin(product.eanNormalized ?? product.ean) !== gtin || product.updatedAt.toISOString() !== expected.expectedUpdatedAt ||
    estimatedReviewSha256(expected.expectedShippingProfile) !== expected.expectedProfileSha256 ||
    estimatedReviewSha256(product.shippingProfile) !== expected.expectedProfileSha256) throw new Error("Identidade, revisão ou perfil mudou; lote cancelado.");
}

function buildReviewedEstimatedProfile(expected: EstimatedReviewEntry) {
  const profile = expected.expectedShippingProfile;
  if (profile.enabled !== false || profile.transportReviewed !== false || profile.measurementBasis !== "estimated" || profile.notifyOnlyPendingLogistics === true) {
    throw new Error("Exige estimativa não revisada, desativada e sem bloqueio Avise-me.");
  }
  // Validate the source too: replacing malformed cargo/services must not repair a corrupt profile silently.
  shippingProfileSchema.parse({ ...profile, transportReviewed: true });
  const previousCargo = (profile.cargoKinds ?? []) as string[];
  if (previousCargo.some(cargo => cargo !== "unspecified" && cargo !== "general" && !expected.cargoKinds.some(value => value === cargo))) throw new Error("A revisão não pode remover restrições de carga existentes.");
  const previousServices = profile.approvedServiceIds as number[] | undefined;
  if (previousServices?.length && expected.approvedServiceIds.some(service => !previousServices.includes(service))) throw new Error("A revisão não pode ampliar serviços já restritos.");
  return { ...profile, enabled: true, transportReviewed: true, cargoKinds: expected.cargoKinds, approvedServiceIds: expected.approvedServiceIds };
}

function isCatalogMedicine(product: EstimatedReviewProduct) {
  const classification = product.catalogClassification;
  return Boolean(classification && typeof classification === "object" && "kind" in classification && classification.kind === "MEDICINE");
}

/** Explicit operational review only. It never changes estimates into measurements. */
export function reviewEstimatedShipping(product: EstimatedReviewProduct, input: unknown, configuredServices: number[]): Record<string, unknown> {
  const expected = estimatedReviewEntrySchema.parse(input);
  verifyEstimatedSnapshot(product, expected);
  const normalizedCategory = (product.category ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (product.status !== "ACTIVE" || product.deletedAt !== null || product.isPopularPharmacy || product.requiresPrescription ||
    product.prescriptionType !== "UNREVIEWED" || isCatalogMedicine(product) || /medicament|farmaci/.test(normalizedCategory)) throw new Error("Produto fora do lote conservador de mercadorias ativas sem receita.");
  const blockedCargo = ["unspecified", "medication", "perishable", "temperature_sensitive"];
  if (expected.cargoKinds.some(cargo => blockedCargo.includes(cargo))) throw new Error("Carga exige confirmação externa separada.");
  const candidate = buildReviewedEstimatedProfile(expected);
  const normalizedName = product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Electrical products and their ambiguous refills have no reviewed battery cargo policy here.
  if (/ele(?:c)?tric|bateria|pilha|recarreg/.test(normalizedName)) throw new Error("Mercadoria elétrica, com bateria/pilha ou recarregável exige revisão separada de transporte.");
  if ((hasPerfumeShippingCargo(normalizedName) && !expected.cargoKinds.includes("perfume")) ||
    (/\b(aerossol|aerosol)\b/.test(normalizedName) && !expected.cargoKinds.includes("aerosol"))) throw new Error("Declare explicitamente a carga identificada no produto.");
  const reviewedProduct = { ...product, prescriptionType: "UNREVIEWED" as const, shippingProfile: candidate };
  validateShippingProduct(reviewedProduct);
  const permitted = permittedShippingServices(configuredServices, [reviewedProduct]);
  if (expected.approvedServiceIds.some(service => !isKnownShippingService(service) || !permitted.includes(service) || assessCarrierCargo(service, expected.cargoKinds).status !== "allowed")) {
    throw new Error("Serviço não configurado, proibido, desconhecido ou condicionado para esta carga.");
  }
  return candidate;
}

/** The carrier's 2100064 review is scoped to conventional medicine and its PAC/SEDEX conditions. */
export function reviewOrdinaryMedicineShipping(product: EstimatedReviewProduct, input: unknown, configuredServices: number[]): Record<string, unknown> {
  const expected = estimatedOrdinaryMedicineEntrySchema.parse(input);
  verifyEstimatedSnapshot(product, expected);
  const classification = readClassification(product.catalogClassification);
  if (product.status !== "ACTIVE" || product.deletedAt !== null || product.isPopularPharmacy ||
    !product.requiresPrescription || product.prescriptionType !== "ORDINARY" || classification.kind !== "MEDICINE" ||
    !classificationIsConsistent(classification, product)) {
    throw new Error("Produto fora do lote de medicamentos ativos com receita comum.");
  }
  const name = product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(?:insulin\w*|asparte|glargina|lispro|glulisina|detemir|degludeca|refriger\w*|congel\w*|geladeira|termolabil\w*|controlad\w*)\b/.test(name)) {
    throw new Error("Insulina, medicamento controlado ou com conservação a frio exige revisão separada.");
  }
  const candidate = buildReviewedEstimatedProfile(expected);
  const reviewedProduct = { ...product, prescriptionType: "ORDINARY" as const, shippingProfile: candidate };
  validateShippingProduct(reviewedProduct);
  const permitted = permittedShippingServices(configuredServices, [reviewedProduct]);
  if (expected.approvedServiceIds.some(service => !permitted.includes(service))) {
    throw new Error("Serviço PAC/SEDEX não configurado ou proibido para esta carga.");
  }
  return candidate;
}
