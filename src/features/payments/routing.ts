import type { Prisma } from "@/generated/prisma/client";
import { decodeAsaasIntegration } from "./asaas-integration";
import { paymentRoutingRules } from "./fee-settings";
import { choosePaymentRoute } from "./routing-policy";
import { PaymentError } from "./schema";
export async function checkoutPaymentConnections(tx: Prisma.TransactionClient, isAdmin: boolean) {
  const rows = await tx.paymentIntegration.findMany({ where: { id: { in: ["mercado-pago", "asaas"] } } });
  const test = rows.find(row => row.id === "mercado-pago" && row.environment === "test");
  if (isAdmin && test) return { rows: [test], methods: [{ ...test, methods: ["pix", "card"] }] };
  const production = rows.filter(row => row.enabled && row.environment === "production");
  const methods = production.flatMap(row => {
    if (row.id === "mercado-pago") return [{ ...row, methods: ["pix", "card"] }];
    try { const config = decodeAsaasIntegration(row); return config.webhookId ? [{ ...row, methods: config.methods }] : []; }
    catch { return []; }
  });
  if (!methods.length) throw new PaymentError("Pagamento online indisponível. Escolha outra forma de pagamento.", 503);
  return { rows: production, methods };
}
export async function resolveCheckoutPayment(connections: Awaited<ReturnType<typeof checkoutPaymentConnections>>, input: { amountCents: number; method: "pix" | "card"; installments: number }, tx: Prisma.TransactionClient) {
  const test = connections.rows.find(row => row.id === "mercado-pago" && row.environment === "test");
  if (test) return { integration: test, route: { provider: "mercado-pago" as const, reason: "test-only" } };
  const route = choosePaymentRoute(input, connections.methods, await paymentRoutingRules(tx));
  const integration = connections.rows.find(row => row.id === route.provider)!;
  return { integration, route };
}
