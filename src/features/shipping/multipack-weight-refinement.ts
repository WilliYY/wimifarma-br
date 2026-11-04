import { z } from "zod";
import { logisticsGtinSchema } from "./logistics-evidence";
import { shippingDraftSchema } from "./product-draft";

const profileSchema = z.record(z.string(), z.json());
const sourceSchema = z.object({
  url: z.url().refine(value => new URL(value).protocol === "https:", "Fonte exige HTTPS."),
  gtin: logisticsGtinSchema,
  presentation: z.string().trim().min(1).max(1000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  evidenceId: z.string().trim().min(1).max(1000).optional(),
}).strict().refine(value => Boolean(value.sha256 || value.evidenceId), "Fonte exige hash ou identificador preservado.");
export const multipackWeightManifestSchema = z.object({
  version: z.literal(1),
  entries: z.array(z.object({
    gtin: logisticsGtinSchema,
    productId: z.string().min(1).max(200),
    expectedName: z.string().min(1).max(1000),
    expectedUpdatedAt: z.iso.datetime(),
    expectedProfile: profileSchema,
    packageQuantity: z.number().int().min(2).max(100),
    unitNetGrams: z.number().positive().max(1000),
    sources: z.array(sourceSchema).min(1).max(20),
    justification: z.string().trim().min(1).max(4000),
  }).strict().refine(entry => entry.sources.every(source => source.gtin === entry.gtin && source.presentation === entry.expectedName), "Fonte diverge do GTIN/apresentação."))
    .min(1).max(5000)
    .refine(entries => new Set(entries.map(entry => entry.gtin)).size === entries.length && new Set(entries.map(entry => entry.productId)).size === entries.length, "Identidade repetida no manifesto."),
}).strict();

export function parseMultipackWeightManifest(value: unknown, gtins: string[]) {
  if (Buffer.byteLength(JSON.stringify(value) ?? "", "utf8") > 1_000_000) throw new Error("Manifesto excede 1 MB.");
  const manifest = multipackWeightManifestSchema.parse(value);
  if (manifest.entries.length !== gtins.length || !manifest.entries.every(entry => gtins.includes(entry.gtin))) throw new Error("GTINs do input e manifesto devem corresponder exatamente.");
  return manifest;
}

function literalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(literalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return "{" + entries.map(([key, item]) => `${JSON.stringify(key)}:${literalJson(item)}`).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function refineMultipackWeight(product: {
  id: string; name: string; status: string; deletedAt: Date | null; category: string | null;
  requiresPrescription: boolean; isPopularPharmacy: boolean; updatedAt: Date; shippingProfile: unknown;
}, entry: z.infer<typeof multipackWeightManifestSchema>["entries"][number]) {
  const fail = (reason: string): never => { throw new Error(`Multipack ${entry.gtin}: ${reason}; lote cancelado.`); };
  if (product.id !== entry.productId || product.name !== entry.expectedName || product.updatedAt.toISOString() !== entry.expectedUpdatedAt) fail("identidade/revisão divergente");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const name = normalize(product.name), category = normalize(product.category ?? "").trim();
  const masses = [...name.matchAll(/\b(\d+(?:[.,]\d+)?)\s*g\b/g)];
  const offers = [...name.matchAll(/\bl\s*(\d+)\s*p\s*(\d+)\b/g)];
  const presentation = name.replace(/\bp\/aliv\b/g, "p aliv");
  const remainder = [...masses, ...offers].reduce((value, match) => value.replace(match[0], " "), presentation)
    .replace(/\b(?:3d white|4em1 ment)\b/g, " ");
  const extraGrouping = /master|caixa|\bcx\b|display|fardo|carton|palete/.test(presentation) ||
    /\d/.test(remainder);
  if (product.status !== "ACTIVE" || product.deletedAt !== null || product.requiresPrescription !== false || product.isPopularPharmacy !== false ||
    !/^(?:higiene(?: pessoal| e beleza)?|higiene bucal|saude bucal|cuidados bucais)$/.test(category) || !/\bcreme dental\b/.test(name) ||
    /\d\s*(?:mg|ml|kg)\b|\b(?:mg|ml|kg|doses?|porcoes?|brindes?|refil|aerossol|inflamavel)\b|[+/%]/.test(presentation) || extraGrouping || masses.length !== 1 || offers.length !== 1 ||
    Number(masses[0]?.[1].replace(",", ".")) !== entry.unitNetGrams || Number(offers[0]?.[1]) !== entry.packageQuantity ||
    Number(offers[0]?.[2]) <= 0 || Number(offers[0]?.[2]) > entry.packageQuantity) fail("apresentação ou elegibilidade inválida");
  const raw = profileSchema.parse(product.shippingProfile);
  if (!shippingDraftSchema.safeParse(raw).success || raw.enabled !== false || raw.transportReviewed !== false || raw.measurementBasis !== "estimated" || raw.reference !== null ||
    "notifyOnlyPendingLogistics" in raw || typeof raw.weightGrams !== "number" ||
    ("approvedServiceIds" in raw && (!Array.isArray(raw.approvedServiceIds) || raw.approvedServiceIds.length !== 0)) ||
    ("cargoKinds" in raw && (!Array.isArray(raw.cargoKinds) || raw.cargoKinds.some(cargo => cargo !== "general")))) fail("perfil protegido ou inválido");
  const totalNetGrams = entry.packageQuantity * entry.unitNetGrams;
  const retailReserveGrams = entry.packageQuantity * 30;
  const weightGrams = Math.ceil((totalNetGrams + retailReserveGrams + 100) / 10) * 10;
  if (weightGrams > 30000) fail("peso fora do limite");
  const draft = { ...entry.expectedProfile, weightGrams };
  if (literalJson(raw) !== literalJson(entry.expectedProfile)) {
    if (typeof entry.expectedProfile.weightGrams === "number" && entry.expectedProfile.weightGrams < weightGrams && literalJson(raw) === literalJson(draft)) return { action: "PRESERVE_ALREADY_REFINED" as const, estimate: null };
    fail("perfil literal divergente");
  }
  if (weightGrams <= Number(raw.weightGrams)) return { action: "PRESERVE_EXISTING_PROFILE" as const, estimate: null };
  return { action: "REFINE_MULTIPACK_WEIGHT_ONLY" as const, estimate: {
    draft: { ...raw, weightGrams }, policyVersion: "dental-multipack-weight-v1", packageQuantity: entry.packageQuantity, unitNetGrams: entry.unitNetGrams,
    totalNetGrams, retailReservePerTubeGrams: 30, retailReserveGrams, externalReserveGrams: 100, roundingStepGrams: 10,
    rounding: "ceil((totalNetGrams + retailReserveGrams + externalReserveGrams) / 10) * 10",
    sources: entry.sources, justification: entry.justification,
    basis: "Hipótese autorizada de conteúdo líquido e reservas; não é medição nem peso bruto confirmado.",
  } };
}
