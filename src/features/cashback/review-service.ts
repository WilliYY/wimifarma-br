import type { Prisma } from "@/generated/prisma/client";
import { reviewRewardCents } from "./review-rewards";
import { CashbackRuleError, lockCashbackAccount } from "./wallet";

export async function saveRewardedReview(tx: Prisma.TransactionClient, customerId: string, productId: string, input: { comment: string; rating: number }) {
  const customer = await tx.customer.findFirst({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } });
  if (!customer) throw new CashbackRuleError("Entre na sua conta de cliente para avaliar.", 401);
  const product = await tx.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true, requiresPrescription: true, isPopularPharmacy: true } });
  if (!product) throw new CashbackRuleError("Produto nao encontrado.", 404);
  const candidate = await tx.order.findFirst({
    where: { customerId, status: "COMPLETED", paymentStatus: "PAID", items: { some: { productId } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: { id: true },
  });
  if (!candidate) throw new CashbackRuleError("Avalie depois que sua compra estiver concluida e paga.", 403);
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${candidate.id} FOR UPDATE`;
  const order = await tx.order.findUniqueOrThrow({ where: { id: candidate.id }, include: { items: { where: { productId } } } });
  if (order.status !== "COMPLETED" || order.paymentStatus !== "PAID") throw new CashbackRuleError("Esta compra nao esta mais elegivel para avaliacao.");
  const account = await lockCashbackAccount(tx, customerId);
  const existing = await tx.productReview.findUnique({ where: { productId_customerId: { productId, customerId } } });
  if (existing) {
    const review = await tx.productReview.update({ where: { id: existing.id }, data: input });
    return { review, awardedCents: 0 };
  }
  const eventKey = `review:${customerId}:${productId}:CREDITED`;
  const credited = await tx.cashbackTransaction.findUnique({ where: { eventKey }, select: { id: true } });
  const item = order.items[0];
  const cents = credited || product.requiresPrescription || product.isPopularPharmacy || !item
    ? 0 : reviewRewardCents(item.unitPriceCents, item.quantity, item.cashbackDiscountCents);
  const review = await tx.productReview.create({ data: {
    ...input, customerId, productId, orderId: order.id,
    cashbackRewardCents: cents, cashbackRewardState: cents > 0 ? "CREDITED" : "NONE",
  } });
  if (cents > 0) {
    const amount = (cents / 100).toFixed(2);
    await tx.cashbackTransaction.create({ data: {
      accountId: account.id, eventKey, type: "CREDIT", amount,
      reference: `review-order:${order.id}`, description: `Bonus de 1% pela avaliacao - pedido ${order.number}`,
    } });
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { balance: { increment: amount }, lifetimeEarned: { increment: amount } } });
    await tx.auditLog.create({ data: { action: "REVIEW_CASHBACK_CREDITED", entity: "ProductReview", entityId: review.id, metadata: { customerId, orderId: order.id, amountCents: cents } } });
  }
  return { review, awardedCents: cents };
}

// O lancamento preserva o vinculo financeiro mesmo se a avaliacao for removida.
export async function reverseReviewRewards(tx: Prisma.TransactionClient, orderId: string) {
  const credits = await tx.cashbackTransaction.findMany({ where: { reference: `review-order:${orderId}`, type: "CREDIT", eventKey: { startsWith: "review:" } } });
  for (const credit of credits) {
    const eventKey = `${credit.eventKey}:REVERSED`;
    if (await tx.cashbackTransaction.findUnique({ where: { eventKey }, select: { id: true } })) continue;
    await tx.cashbackTransaction.create({ data: { accountId: credit.accountId, eventKey, type: "DEBIT", amount: credit.amount, reference: credit.reference, description: "Estorno do bonus de avaliacao por cancelamento/reembolso" } });
    await tx.cashbackAccount.update({ where: { id: credit.accountId }, data: { balance: { decrement: credit.amount }, lifetimeEarned: { decrement: credit.amount } } });
    await tx.auditLog.create({ data: { action: "REVIEW_CASHBACK_REVERSED", entity: "Order", entityId: orderId, metadata: { creditId: credit.id, amount: credit.amount.toString() } } });
  }
  await tx.productReview.updateMany({ where: { orderId, cashbackRewardState: "CREDITED" }, data: { cashbackRewardState: "REVERSED" } });
}
