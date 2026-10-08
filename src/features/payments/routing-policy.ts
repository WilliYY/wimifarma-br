import { compareFees, feeRuleSchema } from "./fee-policy";
import { ASAAS_MIN_CARD_AMOUNT_CENTS, PaymentError } from "./schema";
type Connection = { id: string; accountId: string; enabled: boolean; environment: string; methods: readonly string[] };
type Input = { amountCents: number; method: "pix" | "card"; installments: number };
export type PaymentRoute = { provider: "mercado-pago" | "asaas"; reason: "confirmed-fees" | "default-provider" | "only-available"; ruleId?: string; feeCents?: number };

/** New orders only. A persisted attempt never calls this selector again. */
export function choosePaymentRoute(input: Input, connections: readonly Connection[], rules: readonly unknown[], now = Date.now()): PaymentRoute {
  const available = connections.filter(row => row.enabled && row.environment === "production" && row.methods.includes(input.method)
    && (row.id === "mercado-pago" || (row.id === "asaas" && (input.method === "pix" || (input.installments === 1 && input.amountCents >= ASAAS_MIN_CARD_AMOUNT_CENTS)))));
  if (!available.length) throw new PaymentError("Pagamento online indisponível para esta opção.", 503);
  const bound = rules.filter(raw => {
    const parsed = feeRuleSchema.safeParse(raw);
    if (!parsed.success) return false;
    const rule = parsed.data;
    const connection = available.find(row => row.id === rule.provider);
    const mode = rule.provider === "mercado-pago" ? "orders" : input.method === "pix" ? "static-pix" : "hosted-card";
    return Boolean(connection && rule.accountId === connection.accountId && rule.processingMode === mode);
  });
  const comparison = compareFees({ ...input, maxSettlementDays: 365 }, bound, now);
  // Comparing one known tariff with another unknown tariff is not proof of lower cost.
  if (available.length > 1 && available.every(row => comparison.options.some(option => option.provider === row.id)) && comparison.best) {
    return { provider: comparison.best.provider as PaymentRoute["provider"], reason: "confirmed-fees", ruleId: comparison.best.ruleId, feeCents: comparison.best.feeCents };
  }
  const fallback = available.find(row => row.id === "mercado-pago") ?? available[0];
  return { provider: fallback.id as PaymentRoute["provider"], reason: available.length === 1 ? "only-available" : "default-provider" };
}
