import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { Prisma } from "../src/generated/prisma/client";
import { PaymentError } from "../src/features/payments/schema";
import { normalizeGtin } from "../src/features/supplier-catalog/commerce";
import { SupplierCatalogOfferSchema } from "../src/features/supplier-catalog/schema";

const supplierMap = { ANB: "ANB", Profarma: "PROFARMA", "DM Paraná": "DM", GAM: "GAM" } as const;
const origins = { ANB: ["https://pedido.anbfarma.com.br"], PROFARMA: ["https://pedido.profarma.com.br"],
  DM: ["https://portal.dmparana.com.br"], GAM: ["https://egam.com.br", "https://www.egam.com.br"] };
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const inputMessages = new Set([
  "Invalid or duplicate product EAN.", "Unapproved supplier account.", "Invalid or duplicate report task.",
  "Incomplete report task matrix.", "Approved supplier/product identity required.",
  "Observation is expired, future or older than approved evidence.", "Unconfirmed commercial evidence; retain previous offer.",
  "Unapproved final price source.", "Explicit current absence for the exact approved EAN required.",
  "Existing product required.", "Report SHA-256 mismatch.",
  "Use --report <original-part.json> --accounts <approved-accounts.json> [--sha256 <hash>] [--apply].",
]);
const paymentMessages = new Set([
  "A conferência precisa corresponder ao EAN do produto de distribuidor.",
  "Observe novamente a disponibilidade no fornecedor.", "Revise EAN, custo e validade da conferência.",
  "Informe uma conferência realizada e ainda válida.", "Informe o teto CMED conferido para esta apresentação.",
  "Já existe uma observação diferente nesse horário para esta apresentação.",
]);

export function sanitizeCotadorError(error: unknown): string {
  if (error instanceof Error && inputMessages.has(error.message)) return error.message;
  if (error instanceof z.ZodError) return "Invalid Cotador report or approved account schema.";
  if (error instanceof SyntaxError) return "Invalid JSON input.";
  if (error instanceof PaymentError) return `Quotation policy rejected input (HTTP ${[400, 409, 422].includes(error.status) ? error.status : 409}): ${paymentMessages.has(error.message) ? error.message : "Manual review required."}`;
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    if (/^P\d{4}$/.test(error.code)) return `Database operation failed (${error.code}).`;
    if (["ENOENT", "EACCES", "EPERM", "ERR_PARSE_ARGS_UNKNOWN_OPTION", "ERR_PARSE_ARGS_INVALID_OPTION_VALUE"].includes(error.code)) return `Input operation failed (${error.code}).`;
  }
  return "Cotador import failed; inspect the private runtime diagnostics.";
}

export async function lockCotadorBatch(tx: Pick<Prisma.TransactionClient, "$queryRaw">, productIds: string[]) {
  const ids = [...new Set(productIds)].sort();
  for (const id of ids) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
  if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM "SupplierCatalogOffer" WHERE "productId" IN (${Prisma.join(ids)}) ORDER BY id COLLATE "C" FOR UPDATE`);
}
const supplier = z.enum(["ANB", "Profarma", "DM Paraná", "GAM"]);
const productSchema = z.object({ productId: z.string().min(1), ean: z.string().regex(/^\d{13}$/),
  canonicalGtin: z.string(), name: z.string().min(1), brand: z.string(), requestedQuantity: z.literal(1) });
const reportSchema = z.object({ identity: z.object({ schemaVersion: z.literal(2), manifestHash: fingerprint,
  sourceHash: fingerprint, codeHash: fingerprint, accounts: z.array(z.object({ supplier, fingerprint })).min(1).max(4),
  limit: z.number().int().min(1).max(50) }), products: z.array(productSchema).min(1).max(50),
  tasks: z.array(z.object({ supplier, productIndex: z.number().int().min(0),
    status: z.enum(["pending", "completed", "not_found", "error"]), offers: z.array(z.record(z.string(), z.unknown())).max(1).optional() })).min(1).max(200) });
type Report = z.infer<typeof reportSchema>;
type Offer = z.infer<typeof SupplierCatalogOfferSchema>;
type Target = { id: string; name: string; brand: string | null; inventorySource: string; deletedAt: Date | null;
  eanNormalized: string | null; supplierOffers: { supplier: string; externalCode: string; eanNormalized: string;
    retailCeilingCents: number | null; allocationQuantity: number; commercialCondition: string | null; observedAt: Date }[] };

/** Consume one original bounded report, never the queue summary or a store preview. */
export function parseCotadorReport(raw: unknown, approvedAccounts: unknown): Report {
  const accounts = z.partialRecord(z.enum(["ANB", "PROFARMA", "DM", "GAM"]), fingerprint).parse(approvedAccounts);
  const report = reportSchema.parse(raw);
  const seen = new Set<string>();
  for (const row of report.products) {
    if (normalizeGtin(row.ean) !== row.canonicalGtin || seen.has(row.ean)) throw new Error("Invalid or duplicate product EAN.");
    seen.add(row.ean);
  }
  const sources = new Set<string>();
  for (const account of report.identity.accounts) {
    if (sources.has(account.supplier) || accounts[supplierMap[account.supplier]] !== account.fingerprint) throw new Error("Unapproved supplier account.");
    sources.add(account.supplier);
  }
  const tasks = new Set<string>();
  for (const task of report.tasks) {
    const key = `${task.supplier}:${task.productIndex}`;
    if (!sources.has(task.supplier) || !report.products[task.productIndex] || tasks.has(key) ||
      (task.status === "completed" && task.offers?.length !== 1) ||
      (task.status !== "completed" && (task.offers?.length ?? 0) > 0)) throw new Error("Invalid or duplicate report task.");
    tasks.add(key);
  }
  if (report.identity.limit !== report.products.length || tasks.size !== report.products.length * sources.size) throw new Error("Incomplete report task matrix.");
  return report;
}

export function planCotadorObservation(report: Report, taskIndex: number, row: Record<string, unknown>, target: Target, now = Date.now()): Omit<Offer, "replenishAllocation"> {
  const task = report.tasks[taskIndex];
  const product = report.products[task.productIndex];
  const code = supplierMap[task.supplier];
  const previous = target.supplierOffers.find(offer => offer.supplier === code);
  if (task.status !== "completed" || target.id !== product.productId || target.inventorySource !== "DISTRIBUTOR" || target.deletedAt ||
    target.name !== product.name || target.brand !== product.brand || target.eanNormalized !== product.canonicalGtin ||
    !previous || previous.eanNormalized !== product.canonicalGtin) throw new Error("Approved supplier/product identity required.");
  const observed = typeof row.capturedAt === "string" ? Date.parse(row.capturedAt) : NaN;
  if (!z.iso.datetime({ offset: true }).safeParse(row.capturedAt).success || observed > now || now - observed >= 300_000 ||
    observed < previous.observedAt.getTime()) throw new Error("Observation is expired, future or older than approved evidence.");
  const price = row.presentationCostCents;
  const tax = row.stAmountCents;
  if (row.observedEan !== product.ean || row.identityConfirmed !== true || row.candidateEan != null ||
    row.storeEligible !== true || row.auditStatus !== "OK" || row.commercialEvidenceVersion !== 2 || row.legacyEvidenceRetained !== false ||
    row.availability !== "available" || row.priceUnit !== "PURCHASE_PRESENTATION" || row.priceUnitConfirmed !== true ||
    row.currency !== "BRL" || row.priceSourceConfirmed !== true || row.stKnown !== true ||
    !Array.isArray(row.storeEligibilityReasons) || row.storeEligibilityReasons.length ||
    !Array.isArray(row.commercialReviewReasons) || row.commercialReviewReasons.length ||
    !Number.isSafeInteger(price) || Number(price) <= 0 || row.observedPriceCents !== price || row.price !== Number(price) / 100 ||
    !["valid", "unknown"].includes(String(row.stockQuantityStatus)) ||
    (row.stockQuantityStatus === "unknown" && row.stockQuantity !== null) ||
    (row.stockQuantityStatus === "valid" && row.stockQuantity === null) ||
    (row.stockQuantity !== null && (!Number.isSafeInteger(row.stockQuantity) || Number(row.stockQuantity) <= 0)) ||
    row.commercialConditionConfirmed !== true || row.minimumQuantityConfirmed !== true || row.minimumQuantity !== 1 ||
    (row.commercialCondition || null) !== previous.commercialCondition ||
    (tax === null ? row.stStatus !== "ST_ISENTO" : !Number.isSafeInteger(tax) || Number(tax) < 0) ||
    (tax === 0 && row.stStatus === "COM_ST") || (Number(tax) > 0 && ["SEM_ST", "ST_ISENTO"].includes(String(row.stStatus)))) {
    throw new Error("Unconfirmed commercial evidence; retain previous offer.");
  }
  const expectedLabels = { ANB: "Unit c/ST", PROFARMA: "Preço Final", DM: "Preço final: R$", GAM: "Líquido + Imposto" };
  if (row.priceSourceLabel !== expectedLabels[code] || typeof row.sourceUrl !== "string" || !origins[code].includes(row.sourceUrl)) throw new Error("Unapproved final price source.");
  const parsed = SupplierCatalogOfferSchema.parse({ supplier: code, productId: target.id, externalCode: previous.externalCode,
    eanNormalized: product.canonicalGtin, unitCostCents: price, substitutionTaxCents: tax,
    retailCeilingCents: previous.retailCeilingCents, available: true, stockQuantity: row.stockQuantity,
    allocationQuantity: previous.allocationQuantity, observedAt: row.capturedAt,
    validUntil: new Date(observed + 300_000).toISOString(), commercialCondition: previous.commercialCondition, sourceUrl: row.sourceUrl });
  const { replenishAllocation: _, ...input } = parsed;
  void _;
  return input;
}

/** Absence is historical only: never zero a cost, allocation or previous offer. */
export function planCotadorAbsence(report: Report, taskIndex: number, row: Record<string, unknown>, target: Target, now = Date.now()) {
  const task = report.tasks[taskIndex];
  const product = report.products[task.productIndex];
  const code = supplierMap[task.supplier];
  const previous = target.supplierOffers.find(offer => offer.supplier === code);
  const observed = typeof row.capturedAt === "string" ? Date.parse(row.capturedAt) : NaN;
  if (task.status !== "completed" || target.id !== product.productId || target.inventorySource !== "DISTRIBUTOR" || target.deletedAt ||
    target.name !== product.name || target.brand !== product.brand || target.eanNormalized !== product.canonicalGtin ||
    !previous || previous.eanNormalized !== product.canonicalGtin || row.observedEan !== product.ean ||
    row.identityConfirmed !== true || row.candidateEan != null || row.legacyEvidenceRetained !== false ||
    !z.iso.datetime({ offset: true }).safeParse(row.capturedAt).success || observed > now || now - observed >= 300_000 ||
    observed < previous.observedAt.getTime() || typeof row.sourceUrl !== "string" || !origins[code].includes(row.sourceUrl) ||
    !(row.availability === "unavailable" || (row.availability === "available" && row.stockQuantity === 0 && row.stockQuantityStatus === "valid"))) {
    throw new Error("Explicit current absence for the exact approved EAN required.");
  }
  return { productId: target.id, supplier: code, eanNormalized: product.canonicalGtin,
    observedAt: String(row.capturedAt), reason: "Exact EAN unavailable in original Cotador report." };
}

async function main() {
  const { values } = parseArgs({ options: { report: { type: "string" }, accounts: { type: "string" },
    sha256: { type: "string" }, apply: { type: "boolean", default: false }, help: { type: "boolean", default: false } } });
  if (values.help) {
    console.log("tsx scripts/import-cotador-observations.ts --report <original-part.json> --accounts <approved-accounts.json> [--sha256 <hash>] [--apply]\nDry-run is the default. Reads one original Cotador schemaVersion 2 part (up to 50 products). SHA-256 checks file integrity, not source authenticity. No purchasing or portal access.");
    return;
  }
  if (!values.report || !values.accounts) throw new Error("Use --report <original-part.json> --accounts <approved-accounts.json> [--sha256 <hash>] [--apply].");
  const bytes = await readFile(values.report);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (values.sha256 && values.sha256 !== hash) throw new Error("Report SHA-256 mismatch.");
  const report = parseCotadorReport(JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, "")), JSON.parse((await readFile(values.accounts, "utf8")).replace(/^\uFEFF/, "")));
  const { getPrisma } = await import("../src/lib/prisma");
  const { recordSupplierQuote, recordSupplierAbsence } = await import("../src/features/supplier-catalog/quote-monitor");
  const prisma = getPrisma();
  try {
    const results = await prisma.$transaction(async tx => {
      const output = [];
      // Checkout locks all products before locking offers globally by ID.
      if (values.apply) {
        await lockCotadorBatch(tx, report.products.map(product => product.productId));
      }
      for (let index = 0; index < report.tasks.length; index++) {
        const task = report.tasks[index];
        const product = report.products[task.productIndex];
        const context = { productId: product.productId, supplier: supplierMap[task.supplier] };
        if (task.status !== "completed") { output.push({ ...context, status: "REVIEW", reason: "No confirmed available quotation; previous offer preserved." }); continue; }
        const target = await tx.product.findUnique({ where: { id: product.productId }, include: { supplierOffers: true } });
        let input;
        let absence;
        try {
          if (!target) throw new Error("Existing product required.");
          const row = task.offers![0];
          if (row.availability === "unavailable" || row.stockQuantity === 0) absence = planCotadorAbsence(report, index, row, target);
          else input = planCotadorObservation(report, index, row, target);
        } catch (error) {
          output.push({ ...context, status: "REVIEW", reason: sanitizeCotadorError(error) });
          continue;
        }
        const decision = absence ? await recordSupplierAbsence(tx, absence, { apply: values.apply })
          : await recordSupplierQuote(tx, input!, { apply: values.apply });
        output.push({ ...context, status: decision.status, basisBeforeCents: decision.basisBeforeCents, basisAfterCents: decision.basisAfterCents });
      }
      return output;
    }, { timeout: 60_000 });
    console.log(JSON.stringify({ dryRun: !values.apply, reportSha256: hash, results }, null, 2));
  } finally { await prisma.$disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(`${sanitizeCotadorError(error)} No partial batch was committed.`);
  process.exitCode = 1;
});
