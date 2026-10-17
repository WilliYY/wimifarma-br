import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { settleOrderBenefits } from "@/features/cashback/redemption";
import { settleOrderCashback } from "@/features/cashback/service";

const HOLD_MS = 24 * 60 * 60_000;

/** Only unconfirmed manual orders. Gateway uncertainty remains under payment reconciliation. */
export async function expireSupplierOrders(db: PrismaClient = getPrisma(), now = new Date()) {
  const cutoff = new Date(now.getTime() - HOLD_MS);
  const rows = await db.order.findMany({
    where: { status: "PENDING", paymentStatus: "PENDING", paymentMethod: { not: "ONLINE" }, createdAt: { lt: cutoff },
      items: { some: { inventorySource: "DISTRIBUTOR", supplierReservation: { is: { status: "ACTIVE" } } } } },
    select: { id: true }, orderBy: { createdAt: "asc" }, take: 20,
  });
  for (const row of rows) {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${row.id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: row.id } });
      if (!order || order.status !== "PENDING" || order.paymentStatus !== "PENDING" || order.paymentMethod === "ONLINE" || order.createdAt >= cutoff) return;
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELED", paymentStatus: "CANCELED" } });
      await settleOrderBenefits(tx, order.id);
      await settleOrderCashback(tx, order.id);
      await tx.auditLog.create({ data: { action: "SUPPLIER_ORDER_EXPIRED", entity: "Order", entityId: order.id, metadata: { pendingHours: 24 } } });
    });
  }
}
