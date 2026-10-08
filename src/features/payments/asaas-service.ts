import { createHash, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { z } from "zod";
import type { OnlinePayment } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { createOrderNumber, moneyToCents } from "@/features/orders/checkout";
import { requiresPrescriptionReview, requiresPurchaseAssistance } from "@/features/products/purchase-policy";
import { ASAAS_SANDBOX_INTEGRATION_ID, readAsaasSandboxIntegration } from "./asaas-sandbox-integration";
import { assertAsaasPaymentBinding, createAsaasCheckout, createAsaasPix, listAsaasPayments, retrieveAsaasPayment,
  selectBoundAsaasPayment, type AsaasExpectedPayment } from "./asaas-provider";
import { normalizeAsaasPayment } from "./asaas-normalization";
import { reconcileGatewayState } from "./gateway-state";
import { ASAAS_MIN_CARD_AMOUNT_CENTS, PaymentError } from "./schema";

export const asaasTestCreation = z.object({ productId: z.string().min(1).max(128), method: z.enum(["pix", "card"]), requestId: z.uuid() }).strict();
const uncertain = () => new PaymentError("A criação não foi confirmada. Consulte o ensaio existente antes de continuar.", 503);
const blocked = ["NEW", "SUBMITTING", "UNKNOWN", "REVIEW", "PARTIALLY_REFUNDED", "DISPUTED"];

function assertSandbox(payment: OnlinePayment) {
  if (payment.provider !== "asaas" || payment.integrationId !== ASAAS_SANDBOX_INTEGRATION_ID || payment.environment !== "test"
    || !["pix", "card"].includes(payment.method ?? "")) throw new PaymentError("Ensaio Sandbox não encontrado.", 404);
}
async function connectionFor(payment?: OnlinePayment) {
  const integration = await readAsaasSandboxIntegration();
  if (!integration || integration.environment !== "test" || integration.enabled || !integration.secrets.webhookId
    || (payment && integration.accountId !== payment.accountId)) throw new PaymentError("Prepare a conexão Sandbox antes do ensaio.", 503);
  return integration;
}
function binding(payment: OnlinePayment): AsaasExpectedPayment | null {
  const resource = payment.method === "pix" && payment.pixQrCodeId ? { pixQrCodeId: payment.pixQrCodeId }
    : payment.method === "card" && payment.checkoutSessionId ? { checkoutSessionId: payment.checkoutSessionId } : null;
  return resource ? { amountCents: payment.amountCents, method: payment.method as "pix" | "card", resource,
    externalReference: payment.id, ...(payment.providerOrderId ? { paymentId: payment.providerOrderId } : {}) } : null;
}

// Dedicated synthetic orders avoid reusing commercial messaging, stock or cashback workflows.
export async function createAsaasSandboxPayment(input: z.infer<typeof asaasTestCreation>, userId: string) {
  const parsed = asaasTestCreation.safeParse(input);
  if (!parsed.success) throw new PaymentError("Confira o produto, a forma de teste e o identificador do ensaio.", 422);
  const data = parsed.data;
  const integration = await connectionFor();
  const requestHash = createHash("sha256").update(JSON.stringify({ provider: "asaas", ...data })).digest("hex");
  const prisma = getPrisma();
  const prepared = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(728239148)`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.requestId}, 0))`;
    const current = await tx.paymentIntegration.findUnique({ where: { id: ASAAS_SANDBOX_INTEGRATION_ID } });
    if (!current || current.revision !== integration.revision || current.accountId !== integration.accountId
      || current.environment !== "test" || current.enabled) throw new PaymentError("A configuração mudou. Consulte o painel.", 409);
    const previous = await tx.order.findUnique({ where: { checkoutRequestId: data.requestId }, include: { onlinePayment: true } });
    if (previous) {
      if (!previous.onlinePayment || previous.checkoutRequestHash !== requestHash) throw new PaymentError("Identificador já utilizado por outro envio.", 409);
      assertSandbox(previous.onlinePayment);
      return { payment: previous.onlinePayment, send: false };
    }
    if (await tx.onlinePayment.count({ where: { provider: "asaas", integrationId: ASAAS_SANDBOX_INTEGRATION_ID, status: { in: blocked } } })) {
      throw new PaymentError("Há um ensaio aguardando conferência. Consulte-o antes de criar outro.", 409);
    }
    const product = await tx.product.findUnique({ where: { id: data.productId } });
    if (!product || product.status !== "ACTIVE" || product.stock < 1 || requiresPurchaseAssistance(product)) {
      throw new PaymentError("Escolha um produto disponível para o ensaio.", 409);
    }
    const amountCents = moneyToCents((product.promotionalPrice ?? product.price).toString());
    if (amountCents < 1 || amountCents > 10_000) throw new PaymentError("O ensaio deve ter valor entre R$ 0,01 e R$ 100,00.", 422);
    if (data.method === "card" && amountCents < ASAAS_MIN_CARD_AMOUNT_CENTS) {
      throw new PaymentError("O cartão Asaas exige um valor mínimo de R$ 5,00. Escolha outro produto ou teste Pix.", 422);
    }
    const order = await tx.order.create({ data: {
      number: createOrderNumber(), checkoutRequestId: data.requestId, checkoutRequestHash: requestHash,
      customerId: null, customerName: "Comprador fictício · Sandbox", customerPhone: "11900000000", customerEmail: "homologacao@example.invalid",
      fulfillmentMethod: "PICKUP", paymentMethod: "ONLINE", subtotalCents: amountCents, totalCents: amountCents, deliveryFeeCents: 0,
      privacyConsentAt: new Date(), cashbackEarnedCents: 0, cashbackRedeemedCents: 0,
      requiresPrescriptionReview: requiresPrescriptionReview(product), notes: "Homologação fictícia Asaas. Não preparar, entregar ou enviar mensagens.",
      items: { create: { productId: product.id, productName: product.name, productSlug: product.slug, productImageUrl: product.imageUrl,
        unitPriceCents: amountCents, totalCents: amountCents, quantity: 1 } },
      onlinePayment: { create: { provider: "asaas", integrationId: ASAAS_SANDBOX_INTEGRATION_ID, environment: "test",
        integrationRevision: current.revision, accountId: current.accountId, method: data.method, installments: data.method === "card" ? 1 : null,
        amountCents, idempotencyKey: randomUUID(), status: "SUBMITTING", submissionStartedAt: new Date(), stockReserved: false } },
    }, include: { onlinePayment: true } });
    await tx.auditLog.create({ data: { action: "ASAAS_SANDBOX_PAYMENT_PREPARED", entity: "Order", entityId: order.id, userId,
      metadata: { provider: "asaas", environment: "test", method: data.method, amountCents, requestId: data.requestId } } });
    return { payment: order.onlinePayment!, send: true };
  });
  if (prepared.send) {
    const payment = prepared.payment;
    try {
      if (data.method === "pix") {
        const resource = await createAsaasPix(integration.connection, { amountCents: payment.amountCents, externalReference: payment.id,
          addressKey: integration.secrets.pixAddressKey, description: "Ensaio fictício Wimifarma" });
        await prisma.onlinePayment.update({ where: { id: payment.id }, data: { status: "PENDING", pixQrCodeId: resource.pixQrCodeId,
          pixCode: resource.pixCode, pixExpiresAt: new Date(resource.pixExpiresAt), lastCheckedAt: new Date() } });
      } else {
        const returnUrl = `${new URL(process.env.AUTH_URL!).origin}/admin/pagamentos`;
        const resource = await createAsaasCheckout(integration.connection, { amountCents: payment.amountCents, externalReference: payment.id,
          callback: { successUrl: returnUrl, cancelUrl: returnUrl, expiredUrl: returnUrl } });
        await prisma.onlinePayment.update({ where: { id: payment.id }, data: { status: resource.status === "ACTIVE" ? "PENDING" : "REVIEW",
          checkoutSessionId: resource.checkoutSessionId, checkoutUrl: resource.checkoutUrl, lastCheckedAt: new Date() } });
      }
    } catch {
      await prisma.onlinePayment.updateMany({ where: { id: payment.id, status: "SUBMITTING" }, data: { status: "UNKNOWN" } });
      throw uncertain();
    }
  }
  return asaasSandboxPaymentView(prepared.payment.orderId);
}

export async function asaasSandboxPaymentView(orderId: string) {
  const payment = await getPrisma().onlinePayment.findUniqueOrThrow({ where: { orderId }, include: { order: true } });
  assertSandbox(payment);
  return { orderId, requestId: payment.order.checkoutRequestId, number: payment.order.number, amountCents: payment.amountCents,
    method: payment.method as "pix" | "card", status: payment.status, statusDetail: payment.statusDetail,
    pixCode: payment.status === "PENDING" ? payment.pixCode : null, pixExpiresAt: payment.pixExpiresAt?.toISOString() ?? null,
    qrDataUrl: payment.status === "PENDING" && payment.pixCode ? await QRCode.toDataURL(payment.pixCode, { width: 320, margin: 2 }) : null,
    checkoutUrl: payment.status === "PENDING" ? payment.checkoutUrl : null, fundsAvailable: payment.fundsAvailable,
    createdAt: payment.createdAt.toISOString() };
}

export async function refreshAsaasSandboxPayment(orderId: string) {
  const prisma = getPrisma();
  const payment = await prisma.onlinePayment.findUniqueOrThrow({ where: { orderId } });
  assertSandbox(payment);
  const integration = await connectionFor(payment);
  const expected = binding(payment);
  // No resource ID means an uncertain creation. There is no safe automatic financial retry.
  if (!expected) return asaasSandboxPaymentView(orderId);
  const remote = payment.providerOrderId ? await retrieveAsaasPayment(integration.connection, payment.providerOrderId)
    : selectBoundAsaasPayment(await listAsaasPayments(integration.connection, expected.resource), expected);
  if (!remote) {
    await prisma.onlinePayment.update({ where: { id: payment.id }, data: { lastCheckedAt: new Date() } });
    return asaasSandboxPaymentView(orderId);
  }
  assertAsaasPaymentBinding(remote, expected);
  const snapshot = normalizeAsaasPayment(remote, { environment: "test", accountId: integration.accountId });
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const current = await tx.onlinePayment.findUniqueOrThrow({ where: { orderId }, include: { order: true } });
    assertSandbox(current);
    const retained = binding(current);
    if (!retained || current.accountId !== snapshot.accountId) throw new PaymentError("O vínculo do ensaio mudou.", 409);
    assertAsaasPaymentBinding(remote, retained);
    const canceledFulfillment = current.order.status === "CANCELED" || current.order.paymentStatus === "CANCELED";
    const reconciled = reconcileGatewayState("asaas", current.status, snapshot.status);
    const next = canceledFulfillment && reconciled === "PAID" ? "REVIEW" : reconciled;
    if (!next) return;
    const fundsAvailable = snapshot.fundsAvailable || (next === "PAID" && current.status === "PAID" && current.fundsAvailable);
    await tx.onlinePayment.update({ where: { id: current.id }, data: { providerOrderId: remote.id, status: next,
      statusDetail: snapshot.statusDetail, fundsAvailable, providerUpdatedAt: null, lastCheckedAt: new Date(),
      ...(next === "REVIEW" ? { financialReviewReason: "Confira o estado financeiro canônico antes de alterar o pedido." } : {}),
      ...(["PAID", "REFUNDED", "DISPUTED", "CANCELED"].includes(next) ? { pixCode: null } : {}) } });
    if (["PAID", "PARTIALLY_REFUNDED"].includes(next) && !canceledFulfillment) await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID" } });
    if (next === "CANCELED") await tx.order.update({ where: { id: orderId }, data: { status: "CANCELED", paymentStatus: "CANCELED" } });
    if (["REFUNDED", "DISPUTED"].includes(next)) await tx.order.update({ where: { id: orderId }, data: { status: "CANCELED", paymentStatus: "REFUNDED" } });
    if (next !== current.status || snapshot.statusDetail !== current.statusDetail) await tx.auditLog.create({ data: {
      action: "ASAAS_SANDBOX_PAYMENT_RECONCILED", entity: "Order", entityId: orderId,
      metadata: { provider: "asaas", environment: "test", from: current.status, to: next, fundsAvailable } } });
  });
  return asaasSandboxPaymentView(orderId);
}

export async function getAsaasHomologationState() {
  const prisma = getPrisma();
  const integration = await readAsaasSandboxIntegration();
  const products = await prisma.product.findMany({ where: { status: "ACTIVE", stock: { gt: 0 } }, orderBy: { name: "asc" }, take: 100 });
  const attempts = await prisma.onlinePayment.findMany({ where: { provider: "asaas", environment: "test", integrationId: ASAAS_SANDBOX_INTEGRATION_ID },
    take: 100, orderBy: { createdAt: "desc" }, select: { orderId: true } });
  return { prepared: Boolean(integration), revision: integration?.revision ?? 0, webhookReady: Boolean(integration?.secrets.webhookId),
    products: products.filter(product => !requiresPurchaseAssistance(product)).map(product => ({ id: product.id, name: product.name,
      priceCents: moneyToCents((product.promotionalPrice ?? product.price).toString()) })).filter(product => product.priceCents > 0 && product.priceCents <= 10_000),
    attempts: await Promise.all(attempts.map(payment => asaasSandboxPaymentView(payment.orderId))) };
}
