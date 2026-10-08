import { PaymentError } from "./schema";
import type { AsaasPayment } from "./asaas-provider";
import type { GatewayPaymentSnapshot, GatewayPaymentStatus } from "./gateway-state";

export function normalizeAsaasPayment(payment: AsaasPayment, binding: { environment: "test" | "production"; accountId: string }): GatewayPaymentSnapshot {
  if (!["test", "production"].includes(binding.environment) || !binding.accountId) throw new PaymentError("Conta ou ambiente Asaas inválido.", 422);
  const amountCents = Math.round(payment.value * 100);
  const refundedCents = (payment.refunds ?? []).filter(refund => refund.status === "DONE")
    .reduce((sum, refund) => sum + Math.round(refund.value * 100), 0);
  const financiallyConfirmed = payment.status === "RECEIVED" || (payment.billingType === "CREDIT_CARD" && payment.status === "CONFIRMED");
  let status: GatewayPaymentStatus = "PENDING";
  if (payment.status.startsWith("CHARGEBACK_") || payment.status === "AWAITING_CHARGEBACK_REVERSAL"
    || (payment.chargeback && payment.chargeback.status !== "REVERSED")) status = "DISPUTED";
  else if (refundedCents > amountCents) status = "REVIEW";
  else if (payment.status === "REFUNDED" || (amountCents > 0 && refundedCents === amountCents)) status = "REFUNDED";
  else if (["REFUND_REQUESTED", "REFUND_IN_PROGRESS", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"].includes(payment.status)) status = "REVIEW";
  else if (refundedCents > 0) status = financiallyConfirmed ? "PARTIALLY_REFUNDED" : "REVIEW";
  else if (payment.deleted) status = financiallyConfirmed ? "REVIEW" : "CANCELED";
  else if (financiallyConfirmed) status = "PAID";
  return { provider: "asaas", environment: binding.environment, accountId: binding.accountId,
    remotePaymentId: payment.id, amountCents, status, statusDetail: payment.status,
    fundsAvailable: payment.status === "RECEIVED" && !payment.deleted && ["PAID", "PARTIALLY_REFUNDED"].includes(status),
    providerUpdatedAt: null };
}
