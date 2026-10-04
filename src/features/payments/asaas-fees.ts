import { z } from "zod";
import type { FeeRule } from "./fee-policy";
import { PaymentError } from "./schema";

const centPrecision = (amount: number) => Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7;
const value = z.number().finite().nonnegative().max(10000).refine(centPrecision);
const percentage = z.number().finite().nonnegative().max(100).refine(centPrecision);
const feeResponse = z.object({ payment: z.object({
  creditCard: z.object({ operationValue: value, oneInstallmentPercentage: percentage,
    upToSixInstallmentsPercentage: percentage, upToTwelveInstallmentsPercentage: percentage,
    daysToReceive: z.number().int().min(0).max(365) }).optional(),
}) });

// Baseline only: promotional expiry, free quotas and anticipation require separate contracts.
export function normalizeAsaasFees(raw: unknown, now = Date.now(), zeroInterestInstallments = 1): FeeRule[] {
  const parsed = feeResponse.safeParse(raw);
  if (!parsed.success) throw new PaymentError("Resposta de tarifas incompatível. Confira a conta e o contrato.", 502);
  const checkedAt = new Date(now).toISOString();
  const validUntil = new Date(now + 24 * 60 * 60_000).toISOString();
  const common = { provider: "asaas" as const, currency: "BRL" as const, checkedAt, validUntil,
    source: "https://docs.asaas.com/reference/recuperar-taxas-da-conta", zeroInterestInstallments };
  const rules: FeeRule[] = [];
  // PIX fields alone do not prove composition, caps, free quota or settlement.
  // Keep PIX manual until those account-contract terms are confirmed.
  const card = parsed.data.payment.creditCard;
  if (card) for (const [min, max, rate] of [[1, 1, card.oneInstallmentPercentage], [2, 6, card.upToSixInstallmentsPercentage], [7, 12, card.upToTwelveInstallmentsPercentage]]) {
    rules.push({ ...common, id: `asaas-api-card-${min}`, method: "card", minInstallments: min, maxInstallments: max,
      fixedCents: Math.round(card.operationValue * 100), percentageBps: Math.round(rate * 100), settlementDays: card.daysToReceive });
  }
  if (!rules.length) throw new PaymentError("A conta não retornou tarifas utilizáveis.", 422);
  return rules;
}

export async function retrieveAsaasFees(apiKey: string, environment: "production" | "sandbox", zeroInterestInstallments: number) {
  const origin = environment === "production" ? "https://api.asaas.com" : "https://api-sandbox.asaas.com";
  const response = await fetch(`${origin}/v3/myAccount/fees/`, { headers: { access_token: apiKey, Accept: "application/json", "User-Agent": "Wimifarma/fee-review" },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new PaymentError("O Asaas não confirmou acesso às tarifas. Confira a credencial e o ambiente.", 502);
  if (!response.body) throw new PaymentError("Resposta de tarifas vazia.", 502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > 64000) {
        await reader.cancel();
        throw new PaymentError("Resposta de tarifas acima do limite.", 502);
      }
      chunks.push(chunk);
    }
  } finally { reader.releaseLock(); }
  const text = Buffer.concat(chunks).toString("utf8");
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new PaymentError("Resposta de tarifas inválida.", 502); }
  return normalizeAsaasFees(raw, Date.now(), zeroInterestInstallments);
}
