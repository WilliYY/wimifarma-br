import { z } from "zod";

const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
const cents = z.number().int().min(0).max(1_000_000);
export const feeRuleSchema = z.object({
  id: z.string().trim().min(1).max(100),
  provider: z.enum(["mercado-pago", "asaas", "pagbank", "stripe"]),
  accountId: z.string().min(1).max(100).optional(),
  processingMode: z.enum(["orders", "hosted-card", "static-pix"]).optional(),
  currency: z.literal("BRL").default("BRL"),
  method: z.enum(["pix", "card"]),
  fixedCents: cents,
  percentageBps: z.number().int().min(0).max(10_000),
  minimumFeeCents: cents.optional(),
  maximumFeeCents: cents.optional(),
  minInstallments: z.number().int().min(1).max(12),
  maxInstallments: z.number().int().min(1).max(12),
  zeroInterestInstallments: z.number().int().min(0).max(12).default(1),
  settlementDays: z.number().int().min(0).max(365),
  checkedAt: z.string().datetime({ offset: true }),
  validUntil: z.string().datetime({ offset: true }),
  source: z.url().max(2000).refine(value => {
    const url = new URL(value);
    return /^[\x21-\x7e]+$/.test(value) && url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  }, "Use uma fonte HTTPS sem credenciais ou parâmetros privados."),
}).superRefine((rule, context) => {
  const validity = Date.parse(rule.validUntil) - Date.parse(rule.checkedAt);
  if (validity <= 0 || validity > sevenDaysMs) {
    context.addIssue({ code: "custom", path: ["validUntil"], message: "A confirmação deve valer por até sete dias." });
  }
  if (rule.minInstallments > rule.maxInstallments) {
    context.addIssue({ code: "custom", path: ["maxInstallments"], message: "Faixa de parcelas inválida." });
  }
  if (rule.method === "pix" && (rule.minInstallments !== 1 || rule.maxInstallments !== 1)) {
    context.addIssue({ code: "custom", path: ["maxInstallments"], message: "Pix exige uma parcela." });
  }
  if (rule.method !== "pix" && (rule.minimumFeeCents !== undefined || rule.maximumFeeCents !== undefined)) {
    context.addIssue({ code: "custom", path: ["maximumFeeCents"], message: "Limites de tarifa são exclusivos do Pix." });
  }
  if (rule.minimumFeeCents !== undefined && rule.maximumFeeCents !== undefined && rule.minimumFeeCents > rule.maximumFeeCents) {
    context.addIssue({ code: "custom", path: ["maximumFeeCents"], message: "Limite máximo inferior ao mínimo." });
  }
});
export const feeRulesSchema = z.array(feeRuleSchema).max(48);
export type FeeRule = z.infer<typeof feeRuleSchema>;
export type FeeEstimate = {
  ruleId: string;
  provider: FeeRule["provider"];
  feeCents: number;
  netCents: number;
  settlementDays: number;
  source: string;
};
type ExclusionReason = "invalid" | "expired" | "future-check" | "deadline" | "method" | "installments" | "interest-free" | "superseded" | "unsafe-fee";
export type FeeComparison = {
  best: FeeEstimate | null;
  options: FeeEstimate[];
  excluded: { id: string; reason: ExclusionReason }[];
};
const comparisonInputSchema = z.object({
  amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  method: z.enum(["pix", "card"]),
  installments: z.number().int().min(1).max(12),
  maxSettlementDays: z.number().int().min(0).max(365),
  requiredInterestFree: z.boolean().optional(),
}).refine(value => value.method !== "pix" || value.installments === 1, "Pix exige uma parcela.");
type ComparisonInput = z.infer<typeof comparisonInputSchema>;
const lexicalCompare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Compares confirmed merchant costs only. It never selects or calls a payment gateway. */
export function compareFees(input: ComparisonInput, rules: readonly unknown[], now = Date.now()): FeeComparison {
  const request = comparisonInputSchema.parse(input);
  if (!Number.isFinite(now)) throw new Error("Instante da comparação inválido.");
  if (rules.length > 48) throw new Error("Informe até 48 regras de tarifas.");
  const result: FeeComparison = { best: null, options: [], excluded: [] };
  const candidates: FeeRule[] = [];
  for (const raw of rules) {
    const parsed = feeRuleSchema.safeParse(raw);
    if (!parsed.success) {
      const id = typeof raw === "object" && raw !== null && "id" in raw && typeof raw.id === "string" ? raw.id.slice(0, 100) : "unknown";
      result.excluded.push({ id, reason: "invalid" });
      continue;
    }
    const rule = parsed.data;
    const reason = Date.parse(rule.checkedAt) > now ? "future-check"
      : rule.method !== request.method ? "method"
      : request.installments < rule.minInstallments || request.installments > rule.maxInstallments ? "installments" : null;
    if (reason) result.excluded.push({ id: rule.id, reason });
    else candidates.push(rule);
  }
  const latest = new Map<FeeRule["provider"], FeeRule>();
  for (const rule of candidates) {
    const current = latest.get(rule.provider);
    if (!current || Date.parse(rule.checkedAt) > Date.parse(current.checkedAt)
      || (Date.parse(rule.checkedAt) === Date.parse(current.checkedAt) && lexicalCompare(rule.id, current.id) < 0)) latest.set(rule.provider, rule);
  }
  const requiredInterestFree = request.requiredInterestFree ?? (request.method === "card" && request.installments <= 3);
  for (const rule of candidates) {
    const reason = latest.get(rule.provider) !== rule ? "superseded"
      : Date.parse(rule.validUntil) <= now ? "expired"
      : rule.settlementDays > request.maxSettlementDays ? "deadline"
      : requiredInterestFree && request.method === "card" && rule.zeroInterestInstallments < request.installments ? "interest-free" : null;
    if (reason) {
      result.excluded.push({ id: rule.id, reason });
      continue;
    }
    let fee = (BigInt(request.amountCents) * BigInt(rule.percentageBps) + BigInt(9999)) / BigInt(10000) + BigInt(rule.fixedCents);
    if (rule.minimumFeeCents !== undefined && fee < BigInt(rule.minimumFeeCents)) fee = BigInt(rule.minimumFeeCents);
    if (rule.maximumFeeCents !== undefined && fee > BigInt(rule.maximumFeeCents)) fee = BigInt(rule.maximumFeeCents);
    if (fee > BigInt(Number.MAX_SAFE_INTEGER)) {
      result.excluded.push({ id: rule.id, reason: "unsafe-fee" });
      continue;
    }
    const feeCents = Number(fee);
    result.options.push({ ruleId: rule.id, provider: rule.provider, feeCents,
      netCents: request.amountCents - feeCents, settlementDays: rule.settlementDays, source: rule.source });
  }
  result.options.sort((a, b) => a.feeCents - b.feeCents || a.settlementDays - b.settlementDays
    || lexicalCompare(a.provider, b.provider) || lexicalCompare(a.ruleId, b.ruleId));
  result.best = result.options[0] ?? null;
  return result;
}
