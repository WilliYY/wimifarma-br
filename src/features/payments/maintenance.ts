import { getPrisma } from "@/lib/prisma";
import { cancelUnsubmittedPayment, refreshPayment } from "./service";
import { synchronizeFeeSettings } from "./fee-settings";
import { refreshAsaasSandboxPayment } from "./asaas-service";
import { processAsaasWebhookInbox } from "./asaas-webhook";

let started = false; let running = false;
// Webhooks are primary. This bounded recovery loop handles abandoned tabs and network failures.
export async function reconcilePendingPayments() {
  if (running) return;
  running = true;
  try {
    await processAsaasWebhookInbox().catch(() => console.warn("ASAAS_WEBHOOK_RECOVERY_PENDING"));
    const payments = await getPrisma().onlinePayment.findMany({
      where: { status: { in: ["NEW", "SUBMITTING", "UNKNOWN", "PENDING"] }, updatedAt: { lt: new Date(Date.now() - 60_000) },
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(Date.now() - 5 * 60_000) } }] },
      take: 20, orderBy: { updatedAt: "asc" }, select: { id: true, orderId: true, provider: true, status: true, createdAt: true },
    });
    for (const payment of payments) {
      try {
        if (payment.status === "NEW") {
          if (payment.createdAt.getTime() < Date.now() - 30 * 60_000) await cancelUnsubmittedPayment(payment.orderId);
        } else if (payment.provider === "asaas") await refreshAsaasSandboxPayment(payment.orderId);
        else await refreshPayment(payment.orderId);
      } catch { console.warn("PAYMENT_RECONCILIATION_PENDING", payment.id); }
      finally { await getPrisma().onlinePayment.updateMany({ where: { id: payment.id }, data: { lastCheckedAt: new Date() } }); }
    }
  } finally { running = false; }
}
export function startPaymentMaintenance() {
  if (started) return; started = true;
  const run = () => { void reconcilePendingPayments().catch(() => console.warn("PAYMENT_MAINTENANCE_FAILED")); };
  const initial = setTimeout(run, 30_000); initial.unref();
  const timer = setInterval(run, 60_000); timer.unref();
  const reviewFees = () => { void synchronizeFeeSettings().catch(() => console.warn("PAYMENT_FEE_REVIEW_FAILED")); };
  const feeInitial = setTimeout(reviewFees, 60_000); feeInitial.unref();
  const feeTimer = setInterval(reviewFees, 6 * 60 * 60_000); feeTimer.unref();
}
