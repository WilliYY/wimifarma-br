import { z } from "zod";
import { readClassification } from "./catalog-operations";
import { resolveCmedReference, type CmedReference } from "./cmed-reference";
import { normalizeGtin } from "./gtin";

const OFFICIAL_SOURCE = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file";
const OFFICIAL_SHA256 = "5febea16f9d08f2dbdcf15e954a05b762a7650e834d050c4d57b2dcb4b448fa3";
const referenceSchema = z.object({
  version: z.literal(1), eanNormalized: z.string(), product: z.string(), presentation: z.string(), laboratory: z.string(),
  registration: z.string(), sourceUrl: z.string(), sourceSha256: z.string(), publishedOn: z.string(), observedAt: z.string(),
  rates: z.array(z.object({ label: z.string(), cents: z.number().int() }).strict()).min(1).max(100),
}).strict();
export const cmedImportManifestSchema = z.object({
  version: z.literal(1), products: z.array(z.object({
    productId: z.string().trim().min(1).max(100), expectedUpdatedAt: z.iso.datetime(),
    expectedName: z.string().min(1).max(2000), expectedBrand: z.string().max(2000).nullable(), cmedReference: referenceSchema,
  }).strict()).min(1).max(1000),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.products.map(row => row.productId)).size !== value.products.length ||
    new Set(value.products.map(row => row.cmedReference.eanNormalized)).size !== value.products.length) {
    ctx.addIssue({ code: "custom", message: "Duplicate product or GTIN in CMED manifest." });
  }
});
type Manifest = z.infer<typeof cmedImportManifestSchema>;
export type CmedImportTarget = {
  id: string; name: string; brand: string | null; ean: string | null; eanNormalized: string | null;
  status: string; deletedAt: Date | null; isPopularPharmacy: boolean; catalogClassification: unknown;
  updatedAt: Date; cmedReference: unknown;
};
export type CmedImportTransaction = {
  lockCatalog(): Promise<void>;
  $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  user: { findFirst(input: { where: { id: string; role: "ADMIN"; isActive: true }; select: { id: true } }): Promise<{ id: string } | null> };
  product: {
    findUnique(input: { where: { id: string } }): Promise<CmedImportTarget | null>;
    update(input: { where: { id: string }; data: { cmedReference: CmedReference } }): Promise<unknown>;
  };
  auditLog: { create(input: { data: {
    action: string; entity: string; entityId: string; userId: string;
    metadata: { manifestVersion: number; eanNormalized: string; sourceUrl: string; sourceSha256: string; publishedOn: string; observedAt: string; expectedUpdatedAt: string };
  } }): Promise<unknown> };
};

/** Caller supplies one database transaction. Validation completes before the first write. */
export async function executeCmedImport(tx: CmedImportTransaction, input: Manifest, actorId: string, apply = false, now = Date.now()) {
  const manifest = cmedImportManifestSchema.parse(input);
  await tx.lockCatalog();
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR SHARE`;
  const actor = await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } });
  if (!actor) throw new Error("Active ADMIN actor required.");
  const rows = [...manifest.products].sort((a, b) => a.productId.localeCompare(b.productId));
  const plans = [];
  for (const row of rows) {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${row.productId} FOR UPDATE`;
    const current = await tx.product.findUnique({ where: { id: row.productId } });
    const reference = row.cmedReference;
    if (!current || current.id !== row.productId || current.status !== "ACTIVE" || current.deletedAt || current.isPopularPharmacy ||
      readClassification(current.catalogClassification).kind !== "MEDICINE") throw new Error("CMED target must be an active, non-Popular medicine.");
    if (current.name !== row.expectedName || current.brand !== row.expectedBrand || current.updatedAt.toISOString() !== row.expectedUpdatedAt) {
      throw new Error("CMED identity or revision mismatch; manual review required.");
    }
    const ean = normalizeGtin(current.eanNormalized ?? current.ean);
    if (!ean || ean !== reference.eanNormalized || (current.ean !== null && normalizeGtin(current.ean) !== ean) ||
      !resolveCmedReference(reference, ean, now) || reference.sourceUrl !== OFFICIAL_SOURCE || reference.sourceSha256 !== OFFICIAL_SHA256 ||
      reference.publishedOn !== "2026-10-09") throw new Error("Invalid CMED reference, GTIN or official source edition.");
    const previous = current.cmedReference;
    if (previous !== null && typeof previous === "object" && !Array.isArray(previous)) {
      const stored = previous as Record<string, unknown>;
      const published = typeof stored.publishedOn === "string" ? Date.parse(stored.publishedOn) : NaN;
      const observed = typeof stored.observedAt === "string" ? Date.parse(stored.observedAt) : NaN;
      if (published > Date.parse(reference.publishedOn) || observed > Date.parse(reference.observedAt)) throw new Error("Newer CMED reference already stored; manual review required.");
    }
    plans.push({ productId: row.productId, eanNormalized: ean, publishedOn: reference.publishedOn, action: "UPDATE_CMED_REFERENCE" });
  }
  if (apply) for (const row of rows) {
    await tx.product.update({ where: { id: row.productId }, data: { cmedReference: row.cmedReference } });
    await tx.auditLog.create({ data: {
      action: "CMED_REFERENCE_IMPORTED", entity: "Product", entityId: row.productId, userId: actor.id,
      metadata: { manifestVersion: manifest.version, eanNormalized: row.cmedReference.eanNormalized, sourceUrl: row.cmedReference.sourceUrl,
        sourceSha256: row.cmedReference.sourceSha256, publishedOn: row.cmedReference.publishedOn,
        observedAt: row.cmedReference.observedAt, expectedUpdatedAt: row.expectedUpdatedAt },
    } });
  }
  return plans;
}
