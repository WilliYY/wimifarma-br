import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { productCashbackCents } from "@/features/cashback/rules";
import { allocateCashbackDiscount } from "@/features/cashback/review-rewards";
import { CashbackRuleError, lockCashbackAccount } from "@/features/cashback/wallet";
import { createOrderNumber, prepareCheckoutOrder, type CheckoutRequest } from "./checkout";
import { validateOrderShipping } from "@/features/shipping/service";
import { PaymentError } from "@/features/payments/schema";
import { queueCommerceOrder } from "@/features/miauby/commerce-service";

const orderResultSelect = {
  id: true,
  cashbackEarnedCents: true, cashbackState: true, cashbackRedeemedCents: true,
  cashbackRedemptionState: true, createdAt: true, fulfillmentMethod: true,
  number: true, paymentMethod: true, paymentStatus: true, status: true, totalCents: true,
} satisfies Prisma.OrderSelect;

export async function createCheckout(tx: Prisma.TransactionClient, input: CheckoutRequest, sessionCustomerId?: string, isAdmin = false) {
  const integration = input.paymentMethod === "ONLINE" ? await tx.paymentIntegration.findUnique({ where: { id: "mercado-pago" } }) : null;
  if (input.paymentMethod === "ONLINE" && (!integration || (!integration.enabled && !(isAdmin && integration.environment === "test")))) throw new PaymentError("Pagamento online indisponível. Escolha outra forma de pagamento.", 503);
  const isTest = integration?.environment === "test";
  if (isTest && (!isAdmin || input.cashbackRedeemCents > 0 || !input.customer.email?.endsWith("@testuser.com"))) throw new PaymentError("Na homologação, use apenas dados fictícios e e-mail de comprador de teste, sem cashback.");
  const customer = sessionCustomerId && !isTest ? await tx.customer.findFirst({ where: { id: sessionCustomerId, status: "ACTIVE" }, select: { id: true } }) : null;
  if (input.cashbackRedeemCents > 0 && !customer) throw new CashbackRuleError("Entre na sua conta de cliente para usar cashback.", 401);
  const account = customer && input.checkoutRequestId ? await lockCashbackAccount(tx, customer.id) : null;
  const requestId = customer || integration ? input.checkoutRequestId : undefined;
  if (requestId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${requestId}, 0))`;
  const hash = requestId ? createHash("sha256").update(JSON.stringify({ ...input, checkoutRequestId: undefined })).digest("hex") : undefined;
  if (requestId) {
    const previous = await tx.order.findUnique({ where: { checkoutRequestId: requestId } });
    if (previous) {
      if (previous.customerId !== (customer?.id ?? null) || previous.checkoutRequestHash !== hash) throw new CashbackRuleError("Este envio ja foi usado. Confira seus pedidos antes de enviar novamente.");
      return tx.order.findUniqueOrThrow({ where: { id: previous.id }, select: orderResultSelect });
    }
  }
  const products = await tx.product.findMany({
    select: { cashbackEnabled: true, cashbackRateBps: true, id: true, imageUrl: true, isPopularPharmacy: true, name: true, price: true, promotionalPrice: true, requiresPrescription: true, slug: true, status: true, stock: true },
    where: { id: { in: input.items.map((item) => item.productId) } },
  });
  const prepared = prepareCheckoutOrder(products.map((p) => ({ ...p, price: p.price.toString(), promotionalPrice: p.promotionalPrice?.toString() ?? null })), input.items);
  if (!prepared.ok) throw new CashbackRuleError(prepared.message, prepared.code === "NOT_FOUND" ? 404 : 409, prepared.code);
  const shippingQuote = await validateOrderShipping(tx, input);
  const deliveryFeeCents = shippingQuote?.priceCents ?? prepared.deliveryFeeCents;
  const redeem = input.cashbackRedeemCents;
  if (redeem > prepared.subtotalCents || (redeem > 0 && (!account || account.balance.lessThan((redeem / 100).toFixed(2))))) {
    throw new CashbackRuleError("Saldo de cashback alterado ou insuficiente. Atualize o saldo e revise o desconto.");
  }
  const discounts = allocateCashbackDiscount(prepared.items.map((item) => item.totalCents), redeem);
  const items = prepared.items.map((item, index) => {
    const product = products.find((p) => p.id === item.productId)!;
    const paidUnitCents = Math.floor((item.totalCents - discounts[index]) / item.quantity);
    const earned = customer ? productCashbackCents(product, paidUnitCents, item.quantity) : 0;
    return { ...item, cashbackDiscountCents: discounts[index], cashbackEarnedCents: earned, cashbackRateBps: earned > 0 ? product.cashbackRateBps : 0 };
  });
  const cashbackEarnedCents = items.reduce((sum, item) => sum + item.cashbackEarnedCents, 0);
  if (integration && prepared.subtotalCents + deliveryFeeCents - redeem < 1) throw new PaymentError("Seu saldo cobre o pedido. Escolha o atendimento da farmácia para concluir sem cobrança online.");
  const address = input.fulfillmentMethod === "DELIVERY" ? input.address : undefined;
  const order = await tx.order.create({ data: {
    cashbackEarnedCents, cashbackState: cashbackEarnedCents > 0 ? "PENDING" : "NONE",
    cashbackRedeemedCents: redeem, cashbackRedemptionState: redeem > 0 ? "RESERVED" : "NONE",
    checkoutRequestId: requestId, checkoutRequestHash: hash,
    addressNumber: address?.number, city: address?.city, complement: address?.complement,
    customerEmail: input.customer.email, customerId: customer?.id, customerName: input.customer.name, customerPhone: input.customer.phone,
    deliveryFeeCents, fulfillmentMethod: input.fulfillmentMethod,
    ...(shippingQuote ? { shippingQuote } : {}),
    items: { create: items }, neighborhood: address?.neighborhood, notes: input.notes,
    number: createOrderNumber(), paymentMethod: input.paymentMethod, postalCode: address?.postalCode,
    privacyConsentAt: new Date(), state: address?.state, street: address?.street,
    subtotalCents: prepared.subtotalCents, totalCents: prepared.subtotalCents + deliveryFeeCents - redeem,
    ...(integration ? { onlinePayment: { create: { idempotencyKey: randomUUID(), environment: integration.environment,
      integrationRevision: integration.revision, accountId: integration.accountId, amountCents: prepared.subtotalCents + deliveryFeeCents - redeem } } } : {}),
  } });
  if (redeem > 0 && account) {
    const amount = (redeem / 100).toFixed(2);
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { balance: { decrement: amount } } });
    await tx.cashbackTransaction.create({ data: { accountId: account.id, eventKey: `redemption:${order.id}:RESERVED`, type: "DEBIT", amount, reference: order.number, description: `Cashback reservado para desconto - pedido ${order.number}` } });
    await tx.auditLog.create({ data: { action: "CASHBACK_REDEMPTION_RESERVED", entity: "Order", entityId: order.id, metadata: { customerId: customer?.id, amountCents: redeem } } });
  }
  await queueCommerceOrder(tx, "order", { ...order, items: items.map(item => ({ name: item.productName, quantity: item.quantity })) }, isTest);
  return tx.order.findUniqueOrThrow({ where: { id: order.id }, select: orderResultSelect });
}
