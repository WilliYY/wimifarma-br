import QRCode from "qrcode";
import type { OnlinePayment } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { moneyToCents } from "@/features/orders/checkout";
import { requiresPrescriptionReview, requiresPurchaseAssistance } from "@/features/products/purchase-policy";
import { settleOrderCashback } from "@/features/cashback/service";
import { settleOrderBenefits } from "@/features/cashback/redemption";
import { queueCommerceOrder } from "@/features/miauby/commerce-service";
import { readAsaasIntegration } from "./asaas-integration";
import { assertAsaasPaymentBinding, createAsaasCheckout, createAsaasPix, listAsaasPayments, retrieveAsaasPayment,
  selectBoundAsaasPayment, type AsaasExpectedPayment } from "./asaas-provider";
import { normalizeAsaasPayment } from "./asaas-normalization";
import { reconcileGatewayState } from "./gateway-state";
import { ASAAS_MIN_CARD_AMOUNT_CENTS, PaymentError, type PaymentInput } from "./schema";

function assertCommercial(payment: OnlinePayment) {
  if (payment.provider !== "asaas" || payment.integrationId !== "asaas" || payment.environment !== "production") {
    throw new PaymentError("Pagamento comercial Asaas não encontrado.", 404);
  }
}
async function connectionFor(payment?: OnlinePayment) {
  const integration = await readAsaasIntegration();
  if (!integration || integration.environment !== "production" || !integration.secrets.webhookId
    || (payment && integration.accountId !== payment.accountId)) throw new PaymentError("Confira a conexão deste pagamento Asaas.", 503);
  return integration;
}
function binding(payment: OnlinePayment): AsaasExpectedPayment | null {
  const resource = payment.method === "pix" && payment.pixQrCodeId ? { pixQrCodeId: payment.pixQrCodeId }
    : payment.method === "card" && payment.checkoutSessionId ? { checkoutSessionId: payment.checkoutSessionId } : null;
  return resource ? { amountCents: payment.amountCents, method: payment.method as "pix" | "card", resource,
    externalReference: payment.id, ...(payment.providerOrderId ? { paymentId: payment.providerOrderId } : {}) } : null;
}

/** Commit the winning submission before the financial POST. Uncertain submissions never repeat. */
export async function startAsaasCommercePayment(orderId: string, input: PaymentInput) {
  if (input.method !== "pix" && input.method !== "hosted-card") throw new PaymentError("Use Pix ou cartão no checkout seguro Asaas.", 422);
  const integration = await connectionFor();
  const connection = { accessToken: integration.secrets.accessToken, environment: "production" as const };
  const prisma = getPrisma();
  const prepared = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { onlinePayment: true, items: true } });
    const current = order.onlinePayment;
    if (!current) throw new PaymentError("Pagamento não encontrado.", 404);
    assertCommercial(current);
    if (current.status !== "NEW") return { payment: current, send: false };
    if (current.accountId !== integration.accountId || current.integrationRevision !== integration.revision) {
      throw new PaymentError("A configuração do pagamento mudou. Cancele este pedido e refaça o checkout.", 409);
    }
    const configured = await tx.paymentIntegration.findUnique({ where: { id: "asaas" } });
    if (!configured || !configured.enabled || configured.environment !== "production" || configured.accountId !== current.accountId
      || configured.revision !== integration.revision) throw new PaymentError("Pagamento online indisponível agora.", 503);
    const method = input.method === "pix" ? "pix" : "card";
    if (!integration.secrets.methods.includes(method) || (current.method && current.method !== method)) {
      throw new PaymentError("Esta forma de pagamento não está disponível para o pedido.", 422);
    }
    if (order.status !== "PENDING" || order.paymentStatus !== "PENDING") throw new PaymentError("Este pedido não pode receber um novo pagamento.");
    if (Date.now() - order.createdAt.getTime() > 30 * 60_000) throw new PaymentError("A reserva de preço expirou. Cancele este pedido e refaça o checkout.");
    if (input.method === "hosted-card" && current.amountCents < ASAAS_MIN_CARD_AMOUNT_CENTS) throw new PaymentError("O cartão Asaas exige um valor mínimo de R$ 5,00.", 422);
    if (input.method === "pix" && !integration.secrets.pixAddressKey) throw new PaymentError("Confira a chave Pix da loja.", 503);
    for (const item of [...order.items].sort((a, b) => (a.productId ?? "").localeCompare(b.productId ?? ""))) {
      if (!item.productId) throw new PaymentError("Um produto não está mais disponível.");
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || product.status !== "ACTIVE" || requiresPurchaseAssistance(product) || product.stock < item.quantity
        || moneyToCents((product.promotionalPrice ?? product.price).toString()) !== item.unitPriceCents) {
        throw new PaymentError("Preço, disponibilidade ou estoque mudou. Cancele este pedido e atualize o carrinho.");
      }
      if (requiresPrescriptionReview(product) && !order.requiresPrescriptionReview) throw new PaymentError("A exigência de receita mudou. Cancele este pedido e refaça o checkout.");
      const reserved = await tx.product.updateMany({ where: { id: product.id, updatedAt: product.updatedAt, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
      if (reserved.count !== 1) throw new PaymentError("Estoque alterado. Atualize o carrinho.");
    }
    const payment = await tx.onlinePayment.update({ where: { id: current.id }, data: { status: "SUBMITTING", submissionStartedAt: new Date(),
      method: input.method === "pix" ? "pix" : "card", installments: input.method === "pix" ? null : 1, stockReserved: true,
      pixExpiresAt: input.method === "pix" ? new Date(Date.now() + 7200000) : null } });
    await tx.auditLog.create({ data: { action: "ASAAS_PAYMENT_STARTED", entity: "Order", entityId: orderId,
      metadata: { environment: "production", amountCents: current.amountCents, method: payment.method ?? "" } } });
    return { payment, send: true };
  });
  if (prepared.send) {
    try {
      const payment = prepared.payment;
      if (input.method === "pix") {
        const resource = await createAsaasPix(connection, { amountCents: payment.amountCents, externalReference: payment.id,
          addressKey: integration.secrets.pixAddressKey!, description: "Pedido Wimifarma" });
        await prisma.onlinePayment.update({ where: { id: payment.id }, data: { status: "PENDING", pixQrCodeId: resource.pixQrCodeId,
          pixCode: resource.pixCode, pixExpiresAt: new Date(resource.pixExpiresAt), lastCheckedAt: new Date() } });
      } else {
        const returnUrl = `${new URL(process.env.AUTH_URL!).origin}/checkout/pagamento/${encodeURIComponent(orderId)}`;
        const resource = await createAsaasCheckout(connection, { amountCents: payment.amountCents, externalReference: payment.id,
          callback: { successUrl: returnUrl, cancelUrl: returnUrl, expiredUrl: returnUrl } });
        await prisma.onlinePayment.update({ where: { id: payment.id }, data: { status: resource.status === "ACTIVE" ? "PENDING" : "REVIEW",
          checkoutSessionId: resource.checkoutSessionId, checkoutUrl: resource.checkoutUrl, lastCheckedAt: new Date() } });
      }
    } catch {
      await prisma.onlinePayment.updateMany({ where: { id: prepared.payment.id, status: "SUBMITTING" }, data: { status: "UNKNOWN" } });
      throw new PaymentError("A criação não foi confirmada. Consulte este pagamento antes de continuar.", 503);
    }
  }
  return asaasCommercePaymentView(orderId);
}

export async function asaasCommercePaymentView(orderId: string) {
  const payment = await getPrisma().onlinePayment.findUniqueOrThrow({ where: { orderId }, include: { order: { select: { number: true, customerEmail: true } } } });
  assertCommercial(payment);
  const pending = payment.status === "PENDING";
  return { orderId, provider: "asaas", number: payment.order.number, amountCents: payment.amountCents,
    method: payment.method, installments: payment.installments, status: payment.status, statusDetail: payment.statusDetail,
    pixCode: pending ? payment.pixCode : null, pixExpiresAt: payment.pixExpiresAt?.toISOString() ?? null,
    payerEmail: payment.order.customerEmail ?? "", qrDataUrl: pending && payment.pixCode ? await QRCode.toDataURL(payment.pixCode, { width: 320, margin: 2 }) : null,
    checkoutUrl: pending ? payment.checkoutUrl : null, environment: payment.environment, publicKey: "", fundsAvailable: payment.fundsAvailable };
}

/** Only canonical authenticated GETs may change financial state. */
export async function refreshAsaasCommercePayment(orderId: string) {
  const prisma = getPrisma();
  const payment = await prisma.onlinePayment.findUniqueOrThrow({ where: { orderId } });
  assertCommercial(payment);
  const expected = binding(payment);
  if (!expected) return asaasCommercePaymentView(orderId);
  const integration = await connectionFor(payment);
  const connection = { accessToken: integration.secrets.accessToken, environment: "production" as const };
  const remote = payment.providerOrderId ? await retrieveAsaasPayment(connection, payment.providerOrderId)
    : selectBoundAsaasPayment(await listAsaasPayments(connection, expected.resource), expected);
  if (!remote) {
    await prisma.onlinePayment.update({ where: { id: payment.id }, data: { lastCheckedAt: new Date() } });
    return asaasCommercePaymentView(orderId);
  }
  assertAsaasPaymentBinding(remote, expected);
  const snapshot = normalizeAsaasPayment(remote, { environment: "production", accountId: integration.accountId });
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const current = await tx.onlinePayment.findUniqueOrThrow({ where: { orderId }, include: { order: { include: { items: true } } } });
    assertCommercial(current);
    const retained = binding(current);
    if (!retained || current.accountId !== snapshot.accountId) throw new PaymentError("O vínculo do pagamento mudou.", 409);
    assertAsaasPaymentBinding(remote, retained);
    const canceledFulfillment = current.order.status === "CANCELED" || current.order.paymentStatus === "CANCELED";
    const reconciled = reconcileGatewayState("asaas", current.status, snapshot.status);
    const next = canceledFulfillment && ["PAID", "PARTIALLY_REFUNDED"].includes(reconciled ?? "") ? "REVIEW" : reconciled;
    if (!next) return;
    const terminal = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED", "FAILED", "CANCELED"].includes(next);
    const failed = ["FAILED", "CANCELED"].includes(next);
    if (failed && current.stockReserved) {
      for (const item of current.order.items) if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    const changed = next !== current.status;
    const fundsAvailable = snapshot.fundsAvailable || (next === "PAID" && current.status === "PAID" && current.fundsAvailable);
    await tx.onlinePayment.update({ where: { id: current.id }, data: { providerOrderId: remote.id, status: next,
      statusDetail: snapshot.statusDetail, fundsAvailable, lastCheckedAt: new Date(), stockReserved: terminal ? false : current.stockReserved,
      ...(next === "REVIEW" ? { financialReviewReason: "Confira o estado financeiro canônico antes de alterar o pedido." } : {}),
      ...(terminal || next === "REVIEW" ? { pixCode: null, checkoutUrl: null } : {}) } });
    if (["PAID", "PARTIALLY_REFUNDED"].includes(next) && !canceledFulfillment) await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID" } });
    if (next === "PAID" && current.order.paymentStatus !== "PAID" && !canceledFulfillment) {
      await queueCommerceOrder(tx, "payment", { ...current.order, paymentStatus: "PAID", items: current.order.items.map(item => ({
        name: item.productName, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents })) }, false);
    }
    if (failed) await tx.order.update({ where: { id: orderId }, data: { status: "CANCELED", paymentStatus: "CANCELED" } });
    if (["REFUNDED", "DISPUTED"].includes(next)) await tx.order.update({ where: { id: orderId }, data: { status: "CANCELED", paymentStatus: "REFUNDED" } });
    if (changed && next !== "PARTIALLY_REFUNDED" && next !== "REVIEW") {
      await settleOrderCashback(tx, orderId); await settleOrderBenefits(tx, orderId);
    }
    if (changed || snapshot.statusDetail !== current.statusDetail) await tx.auditLog.create({ data: { action: "ASAAS_PAYMENT_RECONCILED",
      entity: "Order", entityId: orderId, metadata: { provider: "asaas", environment: "production", from: current.status, to: next, fundsAvailable } } });
  });
  return asaasCommercePaymentView(orderId);
}
