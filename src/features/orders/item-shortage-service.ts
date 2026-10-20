import type { Prisma } from "@/generated/prisma/client";
import { lockCashbackAccount } from "@/features/cashback/wallet";
import { lockWimicoinAccount } from "@/features/club/wallet";
import { lockStoreCreditAccount } from "@/features/store-credit/wallet";
import { SHORTAGE_CREDIT_CONSENT_VERSION, type ItemShortageSummary } from "@/features/store-credit/contracts";
import { allocatePixDiscount, orderPixDiscountCents } from "@/features/payments/pix-discount";
import { releaseSupplierShortage } from "@/features/supplier-catalog/inventory";
import { allocateShortageUnits, ItemShortageError, shortageInterval } from "./item-shortage-rules";

type ShortageRow = Prisma.OrderItemShortageGetPayload<{ include: { orderItem: true } }>;
function summary(row: ShortageRow): ItemShortageSummary {
  return { id: row.id, orderItemId: row.orderItemId, productName: row.orderItem.productName, quantity: row.quantity, cashPaidCents: row.cashPaidCents, cashbackReturnCents: row.cashbackReturnCents, wimicoinsReturnPoints: row.wimicoinsReturnPoints, storeCreditReturnCents: row.storeCreditReturnCents, status: row.status, creditState: row.creditState, version: row.version, createdAt: row.createdAt.toISOString(), decidedAt: row.decidedAt?.toISOString() ?? null };
}
async function lockOrder(tx: Prisma.TransactionClient, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { orderBy: { id: "asc" } }, onlinePayment: true } });
  if (!order) throw new ItemShortageError("Pedido não encontrado.", 404);
  return order;
}
function assertEligible(order: Awaited<ReturnType<typeof lockOrder>>) {
  const online = order.onlinePayment;
  if (order.paymentStatus !== "PAID" || !["PENDING", "CONFIRMED", "PREPARING"].includes(order.status) || (order.paymentMethod === "ONLINE" && !online) || (online && (online.status !== "PAID" || online.environment === "test" || online.financialReviewReason || /partial|disput|chargeback|refund/i.test(online.statusDetail ?? "")))) throw new ItemShortageError("O pedido não permite registrar ou aceitar faltas.");
}
async function activeCustomer(tx: Prisma.TransactionClient, customerId: string | null) {
  if (customerId) await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;
  if (!customerId || !await tx.customer.findUnique({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } })) throw new ItemShortageError("Conta indisponível.", 403);
}

export async function proposeItemShortage(tx: Prisma.TransactionClient, input: { orderId: string; orderItemId: string; quantity: number; expectedUpdatedAt: string; actorId: string }): Promise<ItemShortageSummary> {
  const order = await lockOrder(tx, input.orderId);
  const actor = await tx.user.findUnique({ where: { id: input.actorId }, select: { isActive: true, role: true } });
  if (!actor?.isActive || actor.role !== "ADMIN") throw new ItemShortageError("Não autorizado.", 403);
  assertEligible(order);
  await activeCustomer(tx, order.customerId);
  if (order.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) throw new ItemShortageError("O pedido mudou. Atualize a página.");
  const item = order.items.find(row => row.id === input.orderItemId);
  if (!item || item.inventorySource !== "DISTRIBUTOR") throw new ItemShortageError("Item indisponível para esta operação.", 422);
  const existing = await tx.orderItemShortage.findMany({ where: { orderId: order.id, status: { not: "VOIDED" } } });
  if (existing.reduce((sum, row) => sum + row.quantity, 0) + input.quantity >= order.items.reduce((sum, row) => sum + row.quantity, 0)) throw new ItemShortageError("Sem itens para entrega. Solicite o cancelamento e reembolso integral à equipe.");
  const startUnit = shortageInterval(item.quantity, input.quantity, existing.filter(row => row.orderItemId === item.id));
  const pix = allocatePixDiscount(order.items.map(row => ({ productSlug: row.productSlug, totalCents: row.totalCents - row.cashbackDiscountCents - row.wimicoinsDiscountPoints - row.storeCreditDiscountCents })), orderPixDiscountCents(order));
  const units = allocateShortageUnits({ ...item, pixDiscountCents: pix[order.items.indexOf(item)] }).slice(startUnit, startUnit + input.quantity);
  const amounts = units.reduce((acc, unit) => { for (const key of Object.keys(acc) as (keyof typeof acc)[]) acc[key] += unit[key]; return acc; }, { cashPaidCents: 0, cashbackReturnCents: 0, wimicoinsReturnPoints: 0, storeCreditReturnCents: 0, pixDiscountCents: 0, cashbackEarnedVoidedCents: 0, wimicoinsEarnedVoidedPoints: 0 });
  const row = await tx.orderItemShortage.create({ data: { orderId: order.id, orderItemId: item.id, createdById: input.actorId, startUnit, quantity: input.quantity, ...amounts }, include: { orderItem: true } });
  await tx.order.update({ where: { id: order.id }, data: { hasItemShortages: true } });
  await tx.auditLog.create({ data: { userId: input.actorId, action: "ORDER_ITEM_SHORTAGE_PROPOSED", entity: "Order", entityId: order.id, metadata: { shortageId: row.id, orderItemId: item.id, quantity: input.quantity, ...amounts } } });
  return summary(row);
}

export async function decideItemShortage(tx: Prisma.TransactionClient, input: { orderId: string; shortageId: string; version: number; decision: "ACCEPT_CREDIT" | "REQUEST_REFUND"; consent?: boolean; customerId: string }): Promise<ItemShortageSummary> {
  const order = await lockOrder(tx, input.orderId);
  if (order.customerId !== input.customerId) throw new ItemShortageError("Pedido não encontrado.", 404);
  await activeCustomer(tx, input.customerId);
  const row = await tx.orderItemShortage.findUnique({ where: { id: input.shortageId }, include: { orderItem: true } });
  if (!row || row.orderId !== order.id) throw new ItemShortageError("Falta não encontrada.", 404);
  if (input.decision === "ACCEPT_CREDIT" && input.consent !== true) throw new ItemShortageError("Confirme a escolha do crédito.", 422);
  const target = input.decision === "ACCEPT_CREDIT" ? "CREDIT_ACCEPTED" : "REFUND_REQUESTED";
  if (row.status !== "PROPOSED") {
    if (row.status === target && (input.version === row.version || input.version === row.version - 1)) return summary(row);
    throw new ItemShortageError("Esta proposta já mudou. Atualize a página.");
  }
  if (row.version !== input.version) throw new ItemShortageError("Esta proposta já mudou. Atualize a página.");
  assertEligible(order);
  if (input.decision === "ACCEPT_CREDIT") {
    const allShortages = await tx.orderItemShortage.findMany({ where: { orderId: order.id, status: { not: "VOIDED" } } });
    if (allShortages.reduce((sum, shortage) => sum + shortage.quantity, 0) >= order.items.reduce((sum, item) => sum + item.quantity, 0)) throw new ItemShortageError("Sem itens para entrega. Solicite o cancelamento e reembolso integral à equipe.");
    const cashback = await lockCashbackAccount(tx, input.customerId);
    const credit = await lockStoreCreditAccount(tx, input.customerId);
    if (credit.reviewRequired || credit.balanceCents < 0) throw new ItemShortageError("O saldo de crédito precisa de revisão.");
    const coins = await lockWimicoinAccount(tx, input.customerId);
    for (const [kind, amount, origin] of [["ISSUE", row.cashPaidCents, "cash"], ["RETURN", row.storeCreditReturnCents, "store-credit"]] as const) {
      if (amount > 0) await tx.storeCreditTransaction.create({ data: { accountId: credit.id, orderId: order.id, shortageId: row.id, kind, amountCents: amount, eventKey: `shortage:${row.id}:${origin}`, description: `Crédito por item indisponível - pedido ${order.number}` } });
    }
    await tx.storeCreditAccount.update({ where: { id: credit.id }, data: { balanceCents: { increment: row.cashPaidCents + row.storeCreditReturnCents } } });
    if (row.cashbackReturnCents > 0) {
      const amount = (row.cashbackReturnCents / 100).toFixed(2);
      await tx.cashbackTransaction.create({ data: { accountId: cashback.id, type: "CREDIT", amount, eventKey: `shortage:${row.id}:cashback`, reference: order.number, description: `Cashback devolvido por item indisponível - pedido ${order.number}` } });
      await tx.cashbackAccount.update({ where: { id: cashback.id }, data: { balance: { increment: amount }, ...(order.cashbackRedemptionState === "REDEEMED" ? { lifetimeRedeemed: { decrement: amount } } : {}) } });
    }
    if (row.wimicoinsReturnPoints > 0) {
      await tx.wimicoinTransaction.create({ data: { accountId: coins.id, type: "CREDIT", amountPoints: row.wimicoinsReturnPoints, eventKey: `shortage:${row.id}:wimicoins`, reference: order.number, description: `WimiCoins devolvidos por item indisponível - pedido ${order.number}` } });
      await tx.wimicoinAccount.update({ where: { id: coins.id }, data: { balancePoints: { increment: row.wimicoinsReturnPoints }, ...(order.wimicoinsRedemptionState === "REDEEMED" ? { lifetimeRedeemedPoints: { decrement: row.wimicoinsReturnPoints } } : {}) } });
    }
    await releaseSupplierShortage(tx, row.orderItemId, row.quantity);
    await tx.orderItem.update({ where: { id: row.orderItemId }, data: { shortageQuantity: { increment: row.quantity } } });
    await tx.order.update({ where: { id: order.id }, data: { cashbackReturnedCents: { increment: row.cashbackReturnCents }, wimicoinsReturnedPoints: { increment: row.wimicoinsReturnPoints }, storeCreditReturnedCents: { increment: row.storeCreditReturnCents }, cashbackEarnedVoidedCents: { increment: row.cashbackEarnedVoidedCents }, wimicoinsEarnedVoidedPoints: { increment: row.wimicoinsEarnedVoidedPoints } } });
  } else await tx.order.update({ where: { id: order.id }, data: { hasItemShortages: true } });
  const saved = await tx.orderItemShortage.update({ where: { id: row.id }, data: { status: target, creditState: input.decision === "ACCEPT_CREDIT" ? "ISSUED" : "NONE", version: { increment: 1 }, decidedAt: new Date(), consentVersion: input.decision === "ACCEPT_CREDIT" ? SHORTAGE_CREDIT_CONSENT_VERSION : null }, include: { orderItem: true } });
  await tx.auditLog.create({ data: { action: `ORDER_ITEM_SHORTAGE_${target}`, entity: "Order", entityId: order.id, metadata: { shortageId: row.id, customerId: input.customerId, version: saved.version } } });
  return summary(saved);
}
