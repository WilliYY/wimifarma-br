export type PaymentProvider = "mercado-pago" | "asaas";
export type GatewayPaymentStatus = "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "DISPUTED" | "FAILED" | "CANCELED" | "REVIEW";

// A provider response never resurrects canceled fulfillment or erases a refund.
// Asaas can report a payment after expiration; retain that financial fact for review.
export function reconcileGatewayState(provider: PaymentProvider, current: string, incoming: GatewayPaymentStatus): GatewayPaymentStatus | null {
  if (["REFUNDED", "DISPUTED"].includes(current) && incoming !== current) return null;
  if (["FAILED", "CANCELED"].includes(current) && incoming !== current) {
    if (provider !== "asaas") return null;
    if (["REFUNDED", "DISPUTED"].includes(incoming)) return incoming;
    return ["PAID", "PARTIALLY_REFUNDED"].includes(incoming) ? "REVIEW" : null;
  }
  if (current === "REVIEW" && !["REFUNDED", "DISPUTED", "REVIEW"].includes(incoming)) return null;
  if (current === "PAID" && ["PENDING", "FAILED", "CANCELED"].includes(incoming)) return null;
  if (current === "PARTIALLY_REFUNDED" && !["PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED", "REVIEW"].includes(incoming)) return null;
  return incoming;
}

export type GatewayPaymentSnapshot = {
  provider: PaymentProvider;
  environment: "test" | "production";
  accountId: string;
  remotePaymentId: string;
  amountCents: number;
  status: GatewayPaymentStatus;
  statusDetail: string | null;
  fundsAvailable: boolean;
  // Only providers with an authoritative update timestamp may populate this field.
  providerUpdatedAt: Date | null;
  pixCode?: string | null;
  pixExpiresAt?: Date | null;
};
