import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { classifyBridgeResult, formatCommerceOrder, type BridgeResult, type CommerceType } from "./commerce-rules";
import { commerceConnection, commerceTransportStatus, sendCommerceEvent } from "./commerce-provider";

type CommerceDb = Pick<PrismaClient, "miaubyConfig" | "miaubyEvent" | "order">;
const defaults = { enabled: false, cartAlerts: true, orderAlerts: true, paymentAlerts: true, customerStatusAlerts: false };
export async function queueCommerceOrder(tx: Prisma.TransactionClient, type: "order" | "payment", order: Parameters<typeof formatCommerceOrder>[1], isTest = false) {
  const config = await tx.miaubyConfig.findUnique({ where: { id: "commerce" } });
  if (!config?.enabled || !(type === "order" ? config.orderAlerts : config.paymentAlerts)) return;
  const key = `${type}:${order.id}`;
  await tx.miaubyEvent.upsert({ where: { key }, update: {}, create: { key, type, text: formatCommerceOrder(type, order, isTest) } });
}
export async function miaubyDashboard() {
  const db = getPrisma();
  const [saved, events, grouped, transport] = await Promise.all([
    db.miaubyConfig.findUnique({ where: { id: "commerce" } }),
    db.miaubyEvent.findMany({ take: 30, orderBy: { createdAt: "desc" } }),
    db.miaubyEvent.groupBy({ by: ["status"], _count: true }), commerceTransportStatus(),
  ]);
  const count = (status: string) => grouped.find(item => item.status === status)?._count ?? 0;
  return { config: saved ? { enabled: saved.enabled, cartAlerts: saved.cartAlerts, orderAlerts: saved.orderAlerts, paymentAlerts: saved.paymentAlerts, customerStatusAlerts: saved.customerStatusAlerts } : defaults,
    connection: { configured: Boolean(commerceConnection()), recipientHint: process.env.MIAUBY_COMMERCE_RECIPIENT_HINT || "destinatário definido no servidor", status: transport },
    summary: { pending: count("PENDING") + count("PROCESSING"), sent: count("SENT"), failed: count("FAILED"), uncertain: count("UNCERTAIN") },
    events: events.map(event => ({ id: event.id, type: event.type, status: event.status, text: event.text, createdAt: event.createdAt.toISOString(), sentAt: event.sentAt?.toISOString() ?? null, error: event.lastError })),
  };
}
export async function queueCommerceTest() {
  if (!commerceConnection()) throw new Error("Conexão Miauby não configurada no servidor.");
  return getPrisma().miaubyEvent.create({ data: { key: `test:${randomUUID()}`, type: "test", text: "[TESTE — sem compra real]\nMiauby · Wimifarma\nConexão dos alertas da loja verificada. Carrinhos não são pedidos; pedidos recebidos não significam pagamento confirmado. Nenhum cliente, estoque, pagamento ou frete foi alterado." } });
}
let running = false;
export async function processCommerceEvents(db: CommerceDb = getPrisma(), send: (event: { id: string; type: string; text: string; recipient?: string | null }) => Promise<BridgeResult> = sendCommerceEvent) {
  if (running) return; running = true;
  try {
    const now = new Date();
    await db.miaubyEvent.updateMany({ where: { status: "PROCESSING", leaseExpiresAt: { lt: now } }, data: { status: "UNCERTAIN", lastError: "Envio interrompido; confira o WhatsApp antes de repetir." } });
    await db.miaubyEvent.updateMany({ where: { type: "cart", status: "PENDING", createdAt: { lt: new Date(now.getTime() - 600_000) } }, data: { status: "FAILED", lastError: "Aviso de carrinho expirou." } });
    const config = await db.miaubyConfig.findUnique({ where: { id: "commerce" } });
    const types: CommerceType[] = ["test"];
    if (config?.enabled) { if (config.cartAlerts) types.push("cart"); if (config.orderAlerts) types.push("order"); if (config.paymentAlerts) types.push("payment"); if (config.customerStatusAlerts) types.push("order_status"); }
    const events = await db.miaubyEvent.findMany({ where: { status: "PENDING", availableAt: { lte: now }, type: { in: types } }, orderBy: { createdAt: "asc" }, take: 10 });
    for (const event of events) {
      const claimed = await db.miaubyEvent.updateMany({ where: { id: event.id, status: "PENDING" }, data: { status: "PROCESSING", attempts: { increment: 1 }, leaseExpiresAt: new Date(Date.now() + 120_000) } });
      if (!claimed.count) continue;
      try {
        const snapshot = await db.miaubyEvent.findUnique({ where: { id: event.id } });
        if (!snapshot) continue;
        if (snapshot.type === "order_status") {
          const latestConfig = await db.miaubyConfig.findUnique({ where: { id: "commerce" } });
          if (!latestConfig?.enabled || !latestConfig.customerStatusAlerts) {
            await db.miaubyEvent.update({ where: { id: event.id }, data: { status: "FAILED", leaseExpiresAt: null, lastError: "Aviso ao cliente cancelado nas configurações." } });
            continue;
          }
          const order = snapshot.orderId && snapshot.orderStatus ? await db.order.findUnique({ where: { id: snapshot.orderId },
            select: { status: true, paymentStatus: true, paymentMethod: true, fulfillmentMethod: true, requiresPrescriptionReview: true, prescriptionReviewedAt: true,
              onlinePayment: { select: { environment: true, status: true, statusDetail: true, financialReviewReason: true } } } }) : null;
          const cancellation = snapshot.orderStatus === "CANCELED";
          const online = order?.onlinePayment;
          const blocked = !order || order.status !== snapshot.orderStatus
            || online?.environment === "test"
            || (!cancellation && (order.paymentStatus === "CANCELED" || order.paymentStatus === "REFUNDED"
              || order.paymentMethod === "ONLINE" && (order.paymentStatus !== "PAID" || !online || online.status !== "PAID" || online.environment !== "production" || Boolean(online.financialReviewReason) || online.statusDetail === "partially_refunded")))
            || (snapshot.orderStatus === "OUT_FOR_DELIVERY" && order.fulfillmentMethod !== "DELIVERY")
            || (["READY", "OUT_FOR_DELIVERY", "COMPLETED"].includes(snapshot.orderStatus ?? "") && order.requiresPrescriptionReview && !order.prescriptionReviewedAt);
          if (blocked) {
            await db.miaubyEvent.update({ where: { id: event.id }, data: { status: "FAILED", leaseExpiresAt: null, lastError: "Aviso suspenso: pedido alterado, encerrado ou com conferência pendente." } });
            continue;
          }
        }
        const result = await send(snapshot);
        const status = classifyBridgeResult(result, event.id);
        await db.miaubyEvent.update({ where: { id: event.id }, data: { status: status === "PENDING" && event.attempts >= 4 ? "FAILED" : status, messageId: status === "SENT" ? result.messageId : null, sentAt: status === "SENT" ? new Date() : null, availableAt: new Date(Date.now() + 60_000 * Math.min(event.attempts + 1, 5)), leaseExpiresAt: null, lastError: status === "SENT" ? null : status === "UNCERTAIN" ? "Resposta incerta; confira o WhatsApp antes de repetir." : "Transporte bloqueado ou indisponível." } });
      } catch {
        // A timeout may happen after WhatsApp accepted the message. Never blindly retry it.
        await db.miaubyEvent.update({ where: { id: event.id }, data: { status: "UNCERTAIN", leaseExpiresAt: null, lastError: "Não foi possível confirmar o envio. Confira o WhatsApp antes de repetir." } });
      }
    }
    await db.miaubyEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 60 * 86_400_000) }, status: { in: ["SENT", "FAILED"] } } });
  } finally { running = false; }
}
let started = false;
export function startCommerceMaintenance() {
  if (started || !commerceConnection()) return; started = true;
  const run = () => { void processCommerceEvents().catch(() => console.warn("MIAUBY_COMMERCE_MAINTENANCE_FAILED")); };
  const initial = setTimeout(run, 20_000); initial.unref();
  const timer = setInterval(run, 30_000); timer.unref();
}
