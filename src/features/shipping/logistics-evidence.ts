import { z } from "zod";

function validGtinChecksum(value: string): boolean {
  if (!/^(?:\d{8}|\d{12,14})$/.test(value) || /^0+$/.test(value)) return false;
  const body = value.slice(0, -1);
  const sum = [...body].reverse().reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(value.at(-1));
}
export const logisticsGtinSchema = z.string().regex(/^\d{14}$/).refine(validGtinChecksum, "Dígito verificador do GTIN inválido.");
const evidenceUrlSchema = z.string().max(1500).url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
}, "Use uma URL HTTPS pública, sem credenciais ou parâmetros.");
export const logisticsSourceSchema = z.object({
  url: evidenceUrlSchema, capturedAt: z.iso.datetime({ offset: true }), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  gtin: logisticsGtinSchema, excerpt: z.string().trim().min(5).max(2000),
}).strict();
export const physicalSidesSchema = z.tuple([z.number().positive().max(2000), z.number().positive().max(2000), z.number().positive().max(2000)]);
export const logisticsObservationSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), source: logisticsSourceSchema,
  packagingLevel: z.enum(["retail_unit", "master_case", "unknown"]), units: z.number().int().min(1).max(10000).nullable(),
  identityConflict: z.boolean(), weightGrams: z.number().positive().max(600000).nullable(),
  weightBasis: z.enum(["gross_explicit", "net", "unspecified"]), sidesMm: physicalSidesSchema.nullable(),
  dimensionsBasis: z.enum(["labeled_axes", "carton_die", "unlabeled"]), notes: z.string().trim().max(1000),
  sideOrder: z.tuple([z.string().trim().min(1).max(40), z.string().trim().min(1).max(40), z.string().trim().min(1).max(40)]),
}).strict();
export const logisticsEvidenceSchema = z.object({
  version: z.literal(1), gtin: logisticsGtinSchema, observations: z.array(logisticsObservationSchema).max(30),
  sourceDecisions: z.array(z.object({ observationId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), state: z.enum(["rejected", "superseded"]), reason: z.string().trim().min(5).max(500) }).strict()).max(30).default([]),
  review: z.object({ confirmed: z.boolean(), note: z.string().trim().max(1000) }).strict(),
}).strict().superRefine((value, context) => {
  if (new Set(value.observations.map(item => item.id)).size !== value.observations.length) context.addIssue({ code: "custom", message: "Identificador de fonte repetido." });
  if (value.observations.some(item => item.source.gtin !== value.gtin)) context.addIssue({ code: "custom", message: "GTIN da fonte diverge do produto." });
  if (new Set(value.sourceDecisions.map(item => item.observationId)).size !== value.sourceDecisions.length) context.addIssue({ code: "custom", message: "Decisão repetida para a mesma fonte." });
});
export type LogisticsEvidence = z.infer<typeof logisticsEvidenceSchema>;
export function activeLogisticsObservations(value: LogisticsEvidence) {
  const excluded = new Set(value.sourceDecisions.map(item => item.observationId));
  return value.observations.filter(item => !excluded.has(item.id));
}
export function normalizeLogisticsGtin(value: string | null | undefined): string | null {
  return value && validGtinChecksum(value) ? value.padStart(14, "0") : null;
}
export function evidenceStatus(input: unknown): "missing" | "partial" | "conflict" | "complete_reference" {
  const parsed = logisticsEvidenceSchema.safeParse(input);
  if (!parsed.success || !parsed.data.observations.length) return "missing";
  const observations = activeLogisticsObservations(parsed.data);
  if (parsed.data.sourceDecisions.some(decision => !parsed.data.observations.some(item => item.id === decision.observationId))) return "conflict";
  if (!observations.length) return "missing";
  if (observations.some(item => item.identityConflict)) return "conflict";
  const retail = observations.filter(item => item.packagingLevel === "retail_unit" && item.units === 1);
  const weights = retail.filter(item => item.weightBasis === "gross_explicit" && item.weightGrams !== null).map(item => item.weightGrams);
  const dimensions = retail.filter(item => item.sidesMm && item.dimensionsBasis !== "unlabeled").map(item => [...item.sidesMm!].sort((a, b) => a - b).join("/"));
  if (new Set(weights).size > 1 || new Set(dimensions).size > 1) return "conflict";
  return retail.some(item => item.weightBasis === "gross_explicit" && item.weightGrams !== null && item.sidesMm !== null && item.dimensionsBasis !== "unlabeled") ? "complete_reference" : "partial";
}
export function mergeLogisticsEvidence(current: unknown, incoming: unknown): LogisticsEvidence {
  const next = logisticsEvidenceSchema.parse(incoming);
  if (current === null || current === undefined) return { ...next, sourceDecisions: [], review: { confirmed: false, note: "" } };
  const previous = logisticsEvidenceSchema.parse(current);
  if (previous.gtin !== next.gtin) throw new Error("GTIN da evidência diverge do produto.");
  const merged = new Map(previous.observations.map(item => [item.id, item]));
  let changed = false;
  for (const item of next.observations) {
    const existing = merged.get(item.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(item)) throw new Error("Mesmo identificador contém evidências diferentes; preserve a fonte anterior.");
    if (!existing) { merged.set(item.id, item); changed = true; }
  }
  return logisticsEvidenceSchema.parse({ ...previous, observations: [...merged.values()], review: changed ? { confirmed: false, note: "" } : previous.review });
}
