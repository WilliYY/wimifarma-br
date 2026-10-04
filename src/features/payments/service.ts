import { cookies } from "next/headers";
import QRCode from "qrcode";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { settleOrderCashback } from "@/features/cashback/service";
import { settleOrderBenefits } from "@/features/cashback/redemption";
import { getPrisma } from "@/lib/prisma";
import { decryptValue, encryptValue } from "@/lib/secret-vault";
import { moneyToCents } from "@/features/orders/checkout";
import { queueCommerceOrder } from "@/features/miauby/commerce-service";
import { readPaymentIntegration } from "./integration";
import { mercadoPagoRequest } from "./provider";
import { assertPaymentBinding, paymentBody, PIX_EXPIRATION_MS, providerState, providerStatusDetail, validPaymentAccess } from "./rules";
import { PaymentError, providerOrderSchema, type PaymentInput, type ProviderOrder } from "./schema";

export const paymentCookieName = (id: string) => `wimi-payment-${id}`;
export async function authorizePayment(orderId: string) {
  const order = await getPrisma().order.findUnique({ where: { id: orderId }, select: { customerId: true, checkoutRequestId: true, onlinePayment: { select: { environment: true } } } });
  if (!order?.onlinePayment) throw new PaymentError("Pagamento não encontrado.", 404);
  const session = await auth(); const customerId = sessionCustomerId(session);
  const token = (await cookies()).get(paymentCookieName(orderId))?.value;
  if (!(customerId && customerId === order.customerId) && !validPaymentAccess(token, orderId, order.checkoutRequestId)) throw new PaymentError("Entre na conta que fez o pedido ou use o navegador em que iniciou a compra.", 401);
  if (order.onlinePayment.environment === "test" && session?.user?.role !== "ADMIN") throw new PaymentError("Homologação reservada ao administrador.", 403);
}

async function paymentConnection(environment: string, accountId: string) {
  const integration = await readPaymentIntegration();
  if (!integration || integration.environment !== environment || integration.accountId !== accountId) throw new PaymentError("A equipe precisa conferir a conexão deste pagamento.", 503);
  return integration;
}

// Preparation commits before contacting the provider; retries use the same encrypted body and key.
export async function startPayment(orderId: string, input: PaymentInput) {
  const payment = await getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { onlinePayment: true, items: true } });
    const current = order.onlinePayment;
    if (!current) throw new PaymentError("Pagamento não encontrado.", 404);
    if (current.status !== "NEW") return current;
    if (order.status !== "PENDING" || order.paymentStatus !== "PENDING") throw new PaymentError("Este pedido não pode receber um novo pagamento.");
    if (Date.now() - order.createdAt.getTime() > 30 * 60_000) throw new PaymentError("A reserva de preço expirou. Cancele este pedido e refaça o checkout.");
    const connection = await tx.paymentIntegration.findUnique({ where: { id: "mercado-pago" } });
    if (!connection || connection.accountId !== current.accountId || connection.environment !== current.environment || (current.environment === "production" && !connection.enabled)) throw new PaymentError("Pagamento online indisponível agora.", 503);
    if (current.environment === "test" && !input.email.endsWith("@testuser.com")) throw new PaymentError("Use o e-mail de um comprador de teste.");
    for (const item of [...order.items].sort((a, b) => (a.productId ?? "").localeCompare(b.productId ?? ""))) {
      if (!item.productId) throw new PaymentError("Um produto não está mais disponível.");
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || product.status !== "ACTIVE" || product.requiresPrescription || product.isPopularPharmacy || product.stock < item.quantity || moneyToCents((product.promotionalPrice ?? product.price).toString()) !== item.unitPriceCents) throw new PaymentError("Preço, disponibilidade ou estoque mudou. Cancele este pedido e atualize o carrinho.");
      if (current.environment === "production") {
        const reserved = await tx.product.updateMany({ where: { id: product.id, updatedAt: product.updatedAt, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (reserved.count !== 1) throw new PaymentError("Estoque alterado. Atualize o carrinho.");
      }
    }
    const encrypted = encryptValue(JSON.stringify(paymentBody(input, current.amountCents, current.id)));
    const saved = await tx.onlinePayment.update({ where: { id: current.id }, data: { status: "SUBMITTING", pixExpiresAt: input.method === "pix" ? new Date(Date.now() + PIX_EXPIRATION_MS) : null, stockReserved: current.environment === "production", requestCiphertext: encrypted.ciphertext, requestIv: encrypted.iv, requestTag: encrypted.tag } });
    await tx.auditLog.create({ data: { action: "PAYMENT_STARTED", entity: "Order", entityId: orderId, metadata: { environment: current.environment, amountCents: current.amountCents, method: input.method } } });
    return saved;
  });
  if (["SUBMITTING", "UNKNOWN"].includes(payment.status)) await submitStoredPayment(payment.id);
  return paymentView(orderId);
}

export async function submitStoredPayment(paymentId: string) {
  const prisma = getPrisma();
  const payment = await prisma.onlinePayment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.providerOrderId || !["SUBMITTING", "UNKNOWN"].includes(payment.status)) return;
  if (!payment.requestCiphertext || !payment.requestIv || !payment.requestTag) throw new PaymentError("A equipe precisa conferir a tentativa de pagamento.");
  const claimed = await prisma.onlinePayment.updateMany({ where: { id: payment.id, status: { in: ["SUBMITTING", "UNKNOWN"] }, OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(Date.now() - 30_000) } }] }, data: { lastCheckedAt: new Date() } });
  if (!claimed.count) return;
  // Never mint a new key after an uncertain response, nor repeat an old submission indefinitely.
  if (Date.now() - payment.createdAt.getTime() > 60 * 60_000) throw new PaymentError("A tentativa precisa de conferência pela equipe. Não refaça a compra ainda.");
  const connection = await paymentConnection(payment.environment, payment.accountId);
  try {
    const body = JSON.parse(decryptValue({ ciphertext: payment.requestCiphertext, iv: payment.requestIv, tag: payment.requestTag }));
    const remote = providerOrderSchema.parse(await mercadoPagoRequest("/v1/orders", connection.secrets.accessToken, body, payment.idempotencyKey));
    await applyProviderOrder(remote);
  } catch (error) {
    await prisma.onlinePayment.updateMany({ where: { id: payment.id, providerOrderId: null, status: "SUBMITTING" }, data: { status: "UNKNOWN" } });
    throw error;
  }
}

export async function applyProviderOrder(remote: ProviderOrder) {
  const prisma = getPrisma();
  const payment = await prisma.onlinePayment.findUnique({ where: { id: remote.external_reference } });
  if (!payment) return false;
  assertPaymentBinding(remote, payment);
  const updatedAt = new Date(remote.last_updated_date);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
    const current = await tx.onlinePayment.findUniqueOrThrow({ where: { id: payment.id }, include: { order: { include: { items: true } } } });
    assertPaymentBinding(remote, current);
    if (current.providerUpdatedAt && updatedAt <= current.providerUpdatedAt) return;
    const next = providerState(remote);
    const detail = providerStatusDetail(remote);
    // Final states cannot be reversed by a delayed initial response.
    if (["REFUNDED", "DISPUTED", "FAILED", "CANCELED"].includes(current.status) && next !== current.status) return;
    if (current.status === "PAID" && ["PENDING", "FAILED", "CANCELED"].includes(next)) return;
    if (current.status === "PARTIALLY_REFUNDED" && !["PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"].includes(next)) return;
    const failed = ["FAILED", "CANCELED"].includes(next);
    if (failed && current.stockReserved) {
      for (const item of current.order.items) if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    const terminal = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED", "FAILED", "CANCELED"].includes(next);
    await tx.onlinePayment.update({ where: { id: current.id }, data: {
      providerOrderId: remote.id, status: next, statusDetail: detail,
      providerUpdatedAt: updatedAt, lastCheckedAt: new Date(), stockReserved: terminal ? false : current.stockReserved,
      pixCode: terminal ? null : remote.transactions.payments[0].payment_method.qr_code ?? null,
      ...(remote.transactions.payments[0].date_of_expiration ? { pixExpiresAt: new Date(remote.transactions.payments[0].date_of_expiration) } : {}),
      requestCiphertext: null, requestIv: null, requestTag: null,
    } });
    if (["PAID", "PARTIALLY_REFUNDED"].includes(next)) await tx.order.update({ where: { id: current.orderId }, data: { paymentStatus: "PAID" } });
    if (next === "PAID" && current.order.paymentStatus !== "PAID") await queueCommerceOrder(tx, "payment", { ...current.order, paymentStatus: "PAID", items: current.order.items.map(item => ({ name: item.productName, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents })) }, current.environment === "test");
    if (failed) await tx.order.update({ where: { id: current.orderId }, data: { paymentStatus: "CANCELED", status: "CANCELED" } });
    if (["REFUNDED", "DISPUTED"].includes(next)) await tx.order.update({ where: { id: current.orderId }, data: { paymentStatus: "REFUNDED", status: "CANCELED" } });
    if (current.environment === "production" && next !== "PARTIALLY_REFUNDED") {
      await settleOrderCashback(tx, current.orderId);
      await settleOrderBenefits(tx, current.orderId);
    }
    if (next !== current.status || detail !== current.statusDetail) await tx.auditLog.create({ data: {
      action: "PAYMENT_RECONCILED", entity: "Order", entityId: current.orderId,
      metadata: { from: current.status, to: next, detail: detail ?? "", providerOrderId: remote.id, environment: current.environment },
    } });
  });
  return true;
}

export async function refreshPayment(orderId: string) {
  const payment = await getPrisma().onlinePayment.findUniqueOrThrow({ where: { orderId } });
  if (["SUBMITTING", "UNKNOWN"].includes(payment.status)) await submitStoredPayment(payment.id);
  else if (payment.providerOrderId && (!payment.lastCheckedAt || payment.lastCheckedAt.getTime() < Date.now() - 30_000)) {
    const connection = await paymentConnection(payment.environment, payment.accountId);
    await applyProviderOrder(providerOrderSchema.parse(await mercadoPagoRequest(`/v1/orders/${payment.providerOrderId}`, connection.secrets.accessToken)));
    await getPrisma().onlinePayment.update({ where: { id: payment.id }, data: { lastCheckedAt: new Date() } });
  }
  return paymentView(orderId);
}
export async function paymentView(orderId: string) {
  const payment = await getPrisma().onlinePayment.findUniqueOrThrow({ where: { orderId }, include: { order: { select: { number: true, customerEmail: true } } } });
  const integration = await paymentConnection(payment.environment, payment.accountId);
  return { orderId, number: payment.order.number, amountCents: payment.amountCents, status: payment.status,
    statusDetail: payment.statusDetail, pixCode: payment.pixCode, pixExpiresAt: payment.pixExpiresAt?.toISOString() ?? null,
    payerEmail: payment.order.customerEmail ?? "", qrDataUrl: payment.pixCode ? await QRCode.toDataURL(payment.pixCode, { width: 320, margin: 2 }) : null, environment: payment.environment, publicKey: integration.publicKey };
}
export async function cancelUnsubmittedPayment(orderId: string) {
  await getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const payment = await tx.onlinePayment.findUniqueOrThrow({ where: { orderId } });
    if (payment.status !== "NEW") throw new PaymentError("O pagamento já foi iniciado. Consulte a equipe antes de cancelar.");
    await tx.onlinePayment.update({ where: { id: payment.id }, data: { status: "CANCELED" } });
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELED", paymentStatus: "CANCELED" } });
    await settleOrderBenefits(tx, orderId); await settleOrderCashback(tx, orderId);
    await tx.auditLog.create({ data: { action: "UNSUBMITTED_PAYMENT_CANCELED", entity: "Order", entityId: orderId } });
  });
}
