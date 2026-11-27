import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { normalizeGtin } from "../src/features/products/gtin";
import { PaymentError } from "../src/features/payments/schema";

const portal = "https://pedido.anbfarma.com.br";
const api = "https://pedidoapi.anbfarma.com.br";
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const instant = z.iso.datetime({ offset: true });
const suppliers = z.enum(["ANB", "Profarma", "DM Paraná", "GAM"]);
const supplierCodes = { ANB: "ANB", Profarma: "PROFARMA", "DM Paraná": "DM", GAM: "GAM" } as const;
const reportSchema = z.object({
  identity: z.object({ schemaVersion: z.literal(2), manifestHash: fingerprint, sourceHash: fingerprint,
    codeHash: fingerprint, limit: z.number().int().min(1).max(50),
    accounts: z.array(z.object({ supplier: suppliers, fingerprint })).min(1).max(4) }),
  createdAt: instant, completedAt: instant,
  products: z.array(z.object({ productId: z.string().min(1).optional(), ean: z.string(), canonicalGtin: z.string(),
    name: z.string().min(1), brand: z.string() })).min(1).max(50),
  tasks: z.array(z.object({ supplier: suppliers, productIndex: z.number().int().min(0),
    status: z.enum(["pending", "completed", "not_found", "error"]), completedAt: instant.optional(),
    offers: z.array(z.record(z.string(), z.unknown())).max(1).optional() })).min(1).max(200),
});
const truncationKeys = ["requestsSkipped", "responsesSkipped", "responseBufferSkipped", "oversizedBodiesSkipped",
  "busyBodiesSkipped", "recordLimitedResponsesSkipped", "recordBranchesSkipped", "depthBranchesSkipped",
  "nodeBranchesSkipped", "arrayItemsSkipped", "fieldsSkipped"] as const;
const recordSchema = z.object({ capturedAt: instant, hostname: z.string(), status: z.number().int(),
  sourceUrl: z.string(), resourceType: z.enum(["XHR", "Fetch"]), method: z.enum(["GET", "POST"]),
  eanFields: z.array(z.object({ field: z.string(), type: z.enum(["string", "number"]),
    value: z.union([z.string(), z.number().int().safe()]), canonicalGtin: z.string() })).min(1),
  fields: z.record(z.string(), z.unknown()),
});
const networkSchema = z.object({ readOnly: z.literal(true), startedAt: instant, truncated: z.literal(false),
  truncation: z.record(z.string(), z.number().int().nonnegative()), diagnosticCodes: z.array(z.string()).length(0),
  responses: z.array(z.object({ capturedAt: instant, hostname: z.string(), status: z.number(),
    resourceType: z.string(), sourceUrl: z.string().optional() })), records: z.array(recordSchema) });
export type AnbReport = z.infer<typeof reportSchema>;
export type AnbNetwork = z.infer<typeof networkSchema>;
type Target = { id: string; eanNormalized: string | null; ean: string | null; inventorySource: string;
  name: string; brand: string | null; deletedAt: Date | null };
const controlled = new Set(["Invalid ANB report identity or task matrix.", "Unapproved supplier account.",
  "Incomplete network evidence.", "Exact unambiguous ANB display evidence required.",
  "Capture must be in a completed window on the current Brazil day.", "Existing exact Product identity required.",
  "Use --report, --network and --accounts.", "Report SHA-256 mismatch.", "Network SHA-256 mismatch."]);
const policyMessages = new Set(["Confira a identidade, o horário e o preço exibido pela ANB.",
  "A conferência precisa corresponder ao EAN do produto de distribuidor.",
  "Já existe uma observação diferente nesse horário para esta apresentação."]);

/** Only known input/policy rejections are reviewable; operational and programming errors abort the batch. */
export function anbDisplayReviewReason(error: unknown): string | null {
  if (error instanceof PaymentError && [409, 422].includes(error.status) && policyMessages.has(error.message)) return error.message;
  if (error instanceof Error && controlled.has(error.message)) return error.message;
  if (error instanceof z.ZodError) return "Invalid ANB evidence or approved account schema.";
  return null;
}

export function sanitizeAnbDisplayError(error: unknown): string {
  if (error instanceof Error && controlled.has(error.message)) return error.message;
  if (error instanceof z.ZodError) return "Invalid ANB evidence or approved account schema.";
  if (error instanceof SyntaxError) return "Invalid JSON input.";
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    if (/^P\d{4}$/.test(error.code)) return `Database operation failed (${error.code}).`;
    if (["ENOENT", "EACCES", "EPERM", "ERR_PARSE_ARGS_UNKNOWN_OPTION", "ERR_PARSE_ARGS_INVALID_OPTION_VALUE"].includes(error.code)) return `Input operation failed (${error.code}).`;
  }
  return "ANB display import failed; inspect private runtime diagnostics.";
}

/** A bounded original report authenticates the approved account; the observer does not authenticate identity. */
export function parseAnbDisplayEvidence(rawReport: unknown, rawNetwork: unknown, approvedAccounts: unknown) {
  const report = reportSchema.parse(rawReport);
  const accounts = z.partialRecord(z.enum(["ANB", "PROFARMA", "DM", "GAM"]), fingerprint).parse(approvedAccounts);
  const sources = new Set<string>();
  for (const account of report.identity.accounts) {
    if (sources.has(account.supplier) || accounts[supplierCodes[account.supplier]] !== account.fingerprint) throw new Error("Unapproved supplier account.");
    sources.add(account.supplier);
  }
  const seen = new Set<string>();
  for (const product of report.products) {
    const canonical = normalizeGtin(product.ean);
    if (!canonical || /^0+$/.test(canonical) || canonical !== product.canonicalGtin || seen.has(canonical)) throw new Error("Invalid ANB report identity or task matrix.");
    seen.add(canonical);
  }
  const tasks = new Set<string>();
  for (const task of report.tasks) {
    const key = `${task.supplier}:${task.productIndex}`;
    if (!sources.has(task.supplier) || !report.products[task.productIndex] || tasks.has(key) ||
      (task.status === "completed" ? task.offers?.length !== 1 : (task.offers?.length ?? 0) !== 0)) throw new Error("Invalid ANB report identity or task matrix.");
    tasks.add(key);
  }
  if (!sources.has("ANB") || report.identity.limit !== report.products.length || tasks.size !== report.products.length * sources.size) throw new Error("Invalid ANB report identity or task matrix.");
  const network = networkSchema.parse(rawNetwork);
  if (truncationKeys.some(key => network.truncation[key] !== 0) || Object.values(network.truncation).some(value => value !== 0)) throw new Error("Incomplete network evidence.");
  return { report, network };
}

function brazilDay(time: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(time);
}
function moneyCents(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+,\d{2}$/.test(value)) return null;
  const cents = Number(value.replace(",", ""));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
function canonicalField(value: string | number) {
  return normalizeGtin(String(value));
}
function recordMatches(record: AnbNetwork["records"][number], gtin: string) {
  return record.eanFields.some(field => canonicalField(field.value) === gtin || field.canonicalGtin === gtin);
}

/** Display-only history: no eligibility, purchase cost, offer, allocation, stock or selling price is inferred. */
export function planAnbDisplayObservation(report: AnbReport, network: AnbNetwork, taskIndex: number, now = Date.now()) {
  const task = report.tasks[taskIndex];
  const product = task && report.products[task.productIndex];
  const row = task?.offers?.[0];
  const fail = () => { throw new Error("Exact unambiguous ANB display evidence required."); };
  if (!product || task.supplier !== "ANB" || task.status !== "completed" || !row) return fail();
  const matches = network.records.filter(record => recordMatches(record, product.canonicalGtin));
  if (matches.length !== 1) return fail();
  const record = matches[0];
  const code = record.fields.cod_produto;
  const codeValid = (typeof code === "number" && Number.isSafeInteger(code) && code > 0) || (typeof code === "string" && /^[1-9]\d*$/.test(code));
  const barcode = /^(?:ean(?:8|12|13|14)?|gtin(?:8|12|13|14)?|barcode|codbarras?|codigobarras|codigodebarras)$/;
  if (!codeValid || network.records.filter(item => String(item.fields.cod_produto) === String(code)).length !== 1 ||
    record.eanFields.some(field => !barcode.test(field.field.replace(/[^a-z0-9]/gi, "").toLowerCase()) ||
      typeof field.value !== field.type || canonicalField(field.value) !== product.canonicalGtin || field.canonicalGtin !== product.canonicalGtin) ||
    record.status !== 200 || record.hostname !== "pedidoapi.anbfarma.com.br" ||
    record.sourceUrl !== `${api}/epedido/produto/produtos/pesquisa/${product.ean}` ||
    !network.responses.some(response => response.status === 200 && response.hostname === record.hostname &&
      response.sourceUrl === record.sourceUrl && response.capturedAt === record.capturedAt && response.resourceType === record.resourceType) ||
    row.sourceUrl !== portal || row.priceSourceLabel !== "Unit c/ST" || row.priceSourceConfirmed !== true || row.currency !== "BRL" ||
    typeof row.supplierProductName !== "string" || !row.supplierProductName || row.supplierProductName !== record.fields.descricao ||
    (row.observedEan != null && normalizeGtin(row.observedEan) !== product.canonicalGtin) ||
    (row.candidateEan != null && normalizeGtin(row.candidateEan) !== product.canonicalGtin)) return fail();
  const cents = moneyCents(record.fields.valorUnitSt);
  if (!cents || row.observedPriceCents !== cents || row.price !== cents / 100) return fail();
  const captured = instant.safeParse(row.capturedAt);
  const times = [Date.parse(network.startedAt), Date.parse(report.createdAt), Date.parse(record.capturedAt),
    captured.success ? Date.parse(captured.data) : NaN, task.completedAt ? Date.parse(task.completedAt) : NaN, Date.parse(report.completedAt)];
  if (times.some(time => !Number.isFinite(time) || time > now || brazilDay(time) !== brazilDay(now)) ||
    times[0] > times[1] || times[1] > times[2] || times[2] > times[3] || times[3] > times[4] || times[4] > times[5]) {
    throw new Error("Capture must be in a completed window on the current Brazil day.");
  }
  return { eanNormalized: product.canonicalGtin, observedAt: new Date(times[3]).toISOString(), displayPriceCents: cents };
}

export function confirmAnbProductIdentity(product: AnbReport["products"][number], target: Target | null) {
  if (!target || target.deletedAt || target.inventorySource !== "DISTRIBUTOR" || normalizeGtin(target.ean) !== product.canonicalGtin ||
    target.eanNormalized !== product.canonicalGtin || target.name !== product.name ||
    (product.brand !== "" && target.brand !== product.brand) ||
    (product.productId && product.productId !== `identity:${product.canonicalGtin}` && product.productId !== `identity:${product.ean}` && product.productId !== target.id)) {
    throw new Error("Existing exact Product identity required.");
  }
  return target.id;
}

async function main() {
  const { values } = parseArgs({ options: { report: { type: "string" }, network: { type: "string" }, accounts: { type: "string" },
    sha256: { type: "string" }, "network-sha256": { type: "string" }, apply: { type: "boolean", default: false }, help: { type: "boolean", default: false } } });
  if (values.help) {
    console.log("node --import tsx scripts/import-anb-display-observations.ts --report <part-v2.json> --network <observer.json> --accounts <approved.json> [--sha256 <hash>] [--network-sha256 <hash>] [--apply]\nDry-run by default. Current Brazil day only. Display-price history only; no commercial authority. File hashes prove integrity, not authenticity.");
    return;
  }
  if (!values.report || !values.network || !values.accounts) throw new Error("Use --report, --network and --accounts.");
  const [reportBytes, networkBytes, accountBytes] = await Promise.all([readFile(values.report), readFile(values.network), readFile(values.accounts)]);
  const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
  const reportSha256 = digest(reportBytes), networkSha256 = digest(networkBytes);
  if (values.sha256 && values.sha256 !== reportSha256) throw new Error("Report SHA-256 mismatch.");
  if (values["network-sha256"] && values["network-sha256"] !== networkSha256) throw new Error("Network SHA-256 mismatch.");
  const json = (bytes: Buffer) => JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
  const { report, network } = parseAnbDisplayEvidence(json(reportBytes), json(networkBytes), json(accountBytes));
  const evidenceDigest = createHash("sha256").update(`ANB_DISPLAY_V1:${reportSha256}:${networkSha256}`).digest("hex");
  const { getPrisma } = await import("../src/lib/prisma");
  const { recordAnbDisplayObservation } = await import("../src/features/supplier-catalog/quote-monitor");
  const prisma = getPrisma();
  try {
    const results = await prisma.$transaction(async tx => {
      const results = [];
      if (values.apply) {
        for (const gtin of report.products.map(product => product.canonicalGtin).sort()) {
          await tx.$queryRaw`SELECT id FROM "Product" WHERE "eanNormalized" = ${gtin} FOR UPDATE`;
        }
      }
      for (let index = 0; index < report.tasks.length; index++) {
        const task = report.tasks[index];
        if (task.supplier !== "ANB") continue;
        let input;
        try {
          const observation = planAnbDisplayObservation(report, network, index);
          const product = report.products[task.productIndex];
          const target = await tx.product.findUnique({ where: { eanNormalized: product.canonicalGtin },
            select: { id: true, eanNormalized: true, ean: true, inventorySource: true, name: true, brand: true, deletedAt: true } });
          input = { ...observation, productId: confirmAnbProductIdentity(product, target), evidenceDigest };
        } catch (error) {
          const reason = anbDisplayReviewReason(error);
          if (!reason) throw error;
          results.push({ productIndex: task.productIndex, status: "REVIEW", reason });
          continue;
        }
        try {
          const result = await recordAnbDisplayObservation(tx, input, { apply: values.apply });
          results.push({ productIndex: task.productIndex, status: result.status });
        } catch (error) {
          const reason = anbDisplayReviewReason(error);
          if (!reason) throw error;
          results.push({ productIndex: task.productIndex, status: "REVIEW", reason });
        }
      }
      return results;
    }, { timeout: 60_000 });
    console.log(JSON.stringify({ dryRun: !values.apply, reportSha256, networkSha256, evidenceDigest, results }, null, 2));
  } finally { await prisma.$disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(`${sanitizeAnbDisplayError(error)} No partial batch was committed.`);
  process.exitCode = 1;
});
