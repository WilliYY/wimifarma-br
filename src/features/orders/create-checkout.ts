import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { productCashbackCents } from "@/features/cashback/rules";
import { CashbackRuleError, lockCashbackAccount } from "@/features/cashback/wallet";
import { ClubRuleError, reserveWimicoins } from "@/features/club/wallet";
import { productWimicoinsPoints } from "@/features/club/rules";
import { allocateOrderBenefits } from "./benefits";
import { createOrderNumber, prepareCheckoutOrder, type CheckoutRequest } from "./checkout";
import { validateOrderShipping } from "@/features/shipping/service";
import { PaymentError } from "@/features/payments/schema";
import { queueCommerceOrder } from "@/features/miauby/commerce-service";
import { customerShippingFee } from "@/features/shipping/delivery-policy";
import { requiresPrescriptionReview } from "@/features/products/purchase-policy";
import { checkoutPaymentConnections, resolveCheckoutPayment } from "@/features/payments/routing";

const orderResultSelect = {
  id: true,
  requiresPrescriptionReview: true,
  cashbackEarnedCents: true, cashbackState: true, cashbackRedeemedCents: true,
  cashbackRedemptionState: true, createdAt: true, fulfillmentMethod: true,
  wimicoinsEarnedPoints: true, wimicoinsState: true, wimicoinsRedeemedPoints: true, wimicoinsRedemptionState: true,
  number: true, paymentMethod: true, paymentStatus: true, status: true, totalCents: true,
} satisfies Prisma.OrderSelect;

export async function createCheckout(tx: Prisma.TransactionClient, input: CheckoutRequest, sessionCustomerId?: string, isAdmin = false) {
  const coins = input.wimicoinsRedeemPoints ?? 0;
  const connections = input.paymentMethod === "ONLINE" ? await checkoutPaymentConnections(tx, isAdmin) : null;
  const isTest = connections?.rows.some(row => row.environment === "test") ?? false;
  if (isTest && (!isAdmin || input.cashbackRedeemCents > 0 || coins > 0 || !input.customer.email?.endsWith("@testuser.com"))) throw new PaymentError("Na homologação, use apenas dados fictícios e e-mail de comprador de teste, sem cashback ou WimiCoins.");
  const customer = sessionCustomerId && !isTest ? await tx.customer.findFirst({ where: { id: sessionCustomerId, status: "ACTIVE" }, select: { id: true } }) : null;
  if (input.cashbackRedeemCents > 0 && !customer) throw new CashbackRuleError("Entre na sua conta de cliente para usar cashback.", 401);
  if (coins > 0 && !customer) throw new ClubRuleError("Entre na sua conta para usar WimiCoins.", 401);
  const account = customer && input.checkoutRequestId ? await lockCashbackAccount(tx, customer.id) : null;
  const requestId = input.checkoutRequestId;
  if (requestId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${requestId}, 0))`;
  const hash = requestId ? createHash("sha256").update(JSON.stringify({ ...input, checkoutRequestId: undefined })).digest("hex") : undefined;
  if (requestId) {
    const previous = await tx.order.findUnique({ where: { checkoutRequestId: requestId } });
    if (previous) {
      if (previous.customerId !== (customer?.id ?? null) || previous.checkoutRequestHash !== hash) throw new CashbackRuleError("Este envio ja foi usado. Confira seus pedidos antes de enviar novamente.");
      return tx.order.findUniqueOrThrow({ where: { id: previous.id }, select: orderResultSelect });
    }
  }
  const membership = customer ? await tx.clubMembership.findUnique({ where: { customerId: customer.id }, select: { active: true } }) : null;
  if (coins > 0 && !membership?.active) throw new ClubRuleError("Entre no Club para usar WimiCoins.");
  const products = await tx.product.findMany({
    select: { cashbackEnabled: true, cashbackRateBps: true, wimicoinsEnabled: true, wimicoinsRateBps: true, id: true, imageUrl: true, isPopularPharmacy: true, name: true, price: true, promotionalPrice: true, requiresPrescription: true, prescriptionType: true, slug: true, status: true, stock: true },
    where: { id: { in: input.items.map((item) => item.productId) } },
  });
  const prepared = prepareCheckoutOrder(products.map((p) => ({ ...p, price: p.price.toString(), promotionalPrice: p.promotionalPrice?.toString() ?? null })), input.items);
  if (!prepared.ok) throw new CashbackRuleError(prepared.message, prepared.code === "NOT_FOUND" ? 404 : 409, prepared.code);
  const shippingQuote = await validateOrderShipping(tx, input);
  const carrierPriceCents = shippingQuote?.priceCents ?? prepared.deliveryFeeCents;
  const deliveryFeeCents = customerShippingFee(carrierPriceCents, prepared.subtotalCents, input.cashbackRedeemCents + coins);
  const redeem = input.cashbackRedeemCents;
  if (redeem > prepared.subtotalCents || (redeem > 0 && (!account || account.balance.lessThan((redeem / 100).toFixed(2))))) {
    throw new CashbackRuleError("Saldo de cashback alterado ou insuficiente. Atualize o saldo e revise o desconto.");
  }
  let discounts: ReturnType<typeof allocateOrderBenefits>;
  try {
    discounts = allocateOrderBenefits(prepared.items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return { totalCents: item.totalCents, wimicoinsEligible: !product.requiresPrescription && !product.isPopularPharmacy };
    }), redeem, coins);
  } catch { throw new ClubRuleError("Revise os descontos: WimiCoins valem nos itens sem receita e fora da Farmácia Popular.", 422); }
  const items = prepared.items.map((item, index) => {
    const product = products.find((p) => p.id === item.productId)!;
    const paidUnitCents = Math.floor(discounts[index].paidCents / item.quantity);
    const earned = customer ? productCashbackCents(product, paidUnitCents, item.quantity) : 0;
    const earnedPoints = membership?.active ? productWimicoinsPoints(product, paidUnitCents, item.quantity) : 0;
    return { ...item, cashbackDiscountCents: discounts[index].cashbackDiscountCents, wimicoinsDiscountPoints: discounts[index].wimicoinsDiscountPoints,
      cashbackEarnedCents: earned, cashbackRateBps: earned > 0 ? product.cashbackRateBps : 0,
      wimicoinsEarnedPoints: earnedPoints, wimicoinsRateBps: earnedPoints > 0 ? product.wimicoinsRateBps : 0 };
  });
  const cashbackEarnedCents = items.reduce((sum, item) => sum + item.cashbackEarnedCents, 0);
  const wimicoinsEarnedPoints = items.reduce((sum, item) => sum + item.wimicoinsEarnedPoints, 0);
  const totalCents = prepared.subtotalCents + deliveryFeeCents - redeem - coins;
  if (connections && totalCents < 1) throw new PaymentError("Seu saldo cobre o pedido. Escolha o atendimento da farmácia para concluir sem cobrança online.");
  const onlineMethod = input.onlineMethod ?? "pix";
  const selected = connections ? await resolveCheckoutPayment(connections, { amountCents: totalCents, method: onlineMethod,
    installments: onlineMethod === "pix" ? 1 : input.onlineInstallments ?? 1 }, tx) : null;
  const integration = selected?.integration;
  const address = input.fulfillmentMethod === "DELIVERY" ? input.address : undefined;
  const order = await tx.order.create({ data: {
    requiresPrescriptionReview: products.some(requiresPrescriptionReview),
    cashbackEarnedCents, cashbackState: cashbackEarnedCents > 0 ? "PENDING" : "NONE",
    cashbackRedeemedCents: redeem, cashbackRedemptionState: redeem > 0 ? "RESERVED" : "NONE",
    wimicoinsEarnedPoints, wimicoinsState: wimicoinsEarnedPoints > 0 ? "PENDING" : "NONE",
    wimicoinsRedeemedPoints: coins, wimicoinsRedemptionState: coins > 0 ? "RESERVED" : "NONE",
    checkoutRequestId: requestId, checkoutRequestHash: hash,
    addressNumber: address?.number, city: address?.city, complement: address?.complement,
    customerEmail: input.customer.email, customerId: customer?.id, customerName: input.customer.name, customerPhone: input.customer.phone,
    deliveryFeeCents, fulfillmentMethod: input.fulfillmentMethod,
    ...(shippingQuote ? { shippingQuote: { ...shippingQuote, customerPriceCents: deliveryFeeCents, freeShipping: deliveryFeeCents === 0 } } : {}),
    items: { create: items }, neighborhood: address?.neighborhood, notes: input.notes,
    number: createOrderNumber(), paymentMethod: input.paymentMethod, postalCode: address?.postalCode,
    privacyConsentAt: new Date(), state: address?.state, street: address?.street,
    subtotalCents: prepared.subtotalCents, totalCents,
    ...(integration ? { onlinePayment: { create: { idempotencyKey: randomUUID(), provider: integration.id, integrationId: integration.id,
      method: onlineMethod, installments: integration.id === "asaas" && onlineMethod === "card" ? 1 : null, environment: integration.environment,
      integrationRevision: integration.revision, accountId: integration.accountId, amountCents: totalCents } } } : {}),
  } });
  if (selected) await tx.auditLog.create({ data: { action: "PAYMENT_ROUTE_SELECTED", entity: "Order", entityId: order.id,
    metadata: { ...selected.route, integrationRevision: selected.integration.revision, method: onlineMethod, amountCents: totalCents } } });
  if (redeem > 0 && account) {
    const amount = (redeem / 100).toFixed(2);
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { balance: { decrement: amount } } });
    await tx.cashbackTransaction.create({ data: { accountId: account.id, eventKey: `redemption:${order.id}:RESERVED`, type: "DEBIT", amount, reference: order.number, description: `Cashback reservado para desconto - pedido ${order.number}` } });
    await tx.auditLog.create({ data: { action: "CASHBACK_REDEMPTION_RESERVED", entity: "Order", entityId: order.id, metadata: { customerId: customer?.id, amountCents: redeem } } });
  }
  if (coins > 0 && customer) await reserveWimicoins(tx, { customerId: customer.id, orderId: order.id, number: order.number, points: coins });
  await queueCommerceOrder(tx, "order", { ...order, items: items.map(item => ({ name: item.productName, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents })) }, isTest);
  return tx.order.findUniqueOrThrow({ where: { id: order.id }, select: orderResultSelect });
}
