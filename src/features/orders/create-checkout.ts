import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { productCashbackCents } from "@/features/cashback/rules";
import { allocateCashbackDiscount } from "@/features/cashback/review-rewards";
import { CashbackRuleError, lockCashbackAccount } from "@/features/cashback/wallet";
import { createOrderNumber, prepareCheckoutOrder, type CheckoutRequest } from "./checkout";

const orderResultSelect = {
  cashbackEarnedCents: true, cashbackState: true, cashbackRedeemedCents: true,
  cashbackRedemptionState: true, createdAt: true, fulfillmentMethod: true,
  number: true, paymentMethod: true, paymentStatus: true, status: true, totalCents: true,
} satisfies Prisma.OrderSelect;

export async function createCheckout(tx: Prisma.TransactionClient, input: CheckoutRequest, sessionCustomerId?: string) {
  const customer = sessionCustomerId ? await tx.customer.findFirst({ where: { id: sessionCustomerId, status: "ACTIVE" }, select: { id: true } }) : null;
  if (input.cashbackRedeemCents > 0 && !customer) throw new CashbackRuleError("Entre na sua conta de cliente para usar cashback.", 401);
  const account = customer && input.checkoutRequestId ? await lockCashbackAccount(tx, customer.id) : null;
  const requestId = customer ? input.checkoutRequestId : undefined;
  const hash = requestId ? createHash("sha256").update(JSON.stringify({ ...input, checkoutRequestId: undefined })).digest("hex") : undefined;
  if (requestId) {
    const previous = await tx.order.findUnique({ where: { checkoutRequestId: requestId } });
    if (previous) {
      if (previous.customerId !== customer?.id || previous.checkoutRequestHash !== hash) throw new CashbackRuleError("Este envio ja foi usado. Confira seus pedidos antes de enviar novamente.");
      return tx.order.findUniqueOrThrow({ where: { id: previous.id }, select: orderResultSelect });
    }
  }
  const products = await tx.product.findMany({
    select: { cashbackEnabled: true, cashbackRateBps: true, id: true, imageUrl: true, isPopularPharmacy: true, name: true, price: true, promotionalPrice: true, requiresPrescription: true, slug: true, status: true, stock: true },
    where: { id: { in: input.items.map((item) => item.productId) } },
  });
  const prepared = prepareCheckoutOrder(products.map((p) => ({ ...p, price: p.price.toString(), promotionalPrice: p.promotionalPrice?.toString() ?? null })), input.items);
  if (!prepared.ok) throw new CashbackRuleError(prepared.message, prepared.code === "NOT_FOUND" ? 404 : 409, prepared.code);
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
  const address = input.fulfillmentMethod === "DELIVERY" ? input.address : undefined;
  const order = await tx.order.create({ data: {
    cashbackEarnedCents, cashbackState: cashbackEarnedCents > 0 ? "PENDING" : "NONE",
    cashbackRedeemedCents: redeem, cashbackRedemptionState: redeem > 0 ? "RESERVED" : "NONE",
    checkoutRequestId: requestId, checkoutRequestHash: hash,
    addressNumber: address?.number, city: address?.city, complement: address?.complement,
    customerEmail: input.customer.email, customerId: customer?.id, customerName: input.customer.name, customerPhone: input.customer.phone,
    deliveryFeeCents: prepared.deliveryFeeCents, fulfillmentMethod: input.fulfillmentMethod,
    items: { create: items }, neighborhood: address?.neighborhood, notes: input.notes,
    number: createOrderNumber(), paymentMethod: input.paymentMethod, postalCode: address?.postalCode,
    privacyConsentAt: new Date(), state: address?.state, street: address?.street,
    subtotalCents: prepared.subtotalCents, totalCents: prepared.totalCents - redeem,
  } });
  if (redeem > 0 && account) {
    const amount = (redeem / 100).toFixed(2);
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { balance: { decrement: amount } } });
    await tx.cashbackTransaction.create({ data: { accountId: account.id, eventKey: `redemption:${order.id}:RESERVED`, type: "DEBIT", amount, reference: order.number, description: `Cashback reservado para desconto - pedido ${order.number}` } });
    await tx.auditLog.create({ data: { action: "CASHBACK_REDEMPTION_RESERVED", entity: "Order", entityId: order.id, metadata: { customerId: customer?.id, amountCents: redeem } } });
  }
  return tx.order.findUniqueOrThrow({ where: { id: order.id }, select: orderResultSelect });
}
