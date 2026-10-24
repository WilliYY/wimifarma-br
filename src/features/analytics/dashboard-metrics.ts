import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// Sandbox payment attempts are not commercial orders in this summary.
export const dashboardOrdersWhere = {
  NOT: { onlinePayment: { is: { environment: "test" } } },
} satisfies Prisma.OrderWhereInput;

export const dashboardPurchasesWhere = {
  status: "COMPLETED",
  paymentStatus: "PAID",
  AND: [dashboardOrdersWhere, {
    OR: [
      { paymentMethod: { not: "ONLINE" }, onlinePayment: { is: null } },
      { onlinePayment: { is: {
        environment: "production",
        status: "PAID",
        financialReviewReason: null,
        OR: [
          { statusDetail: null },
          { NOT: { OR: ["partial", "disput", "chargeback", "refund"].map((term) => ({
            statusDetail: { contains: term, mode: "insensitive" as const },
          })) } },
        ],
      } } },
    ],
  }],
} satisfies Prisma.OrderWhereInput;

export type DashboardOrderSummary = {
  orders: { total: number; withAccount: number; withoutAccount: number };
  purchases: { total: number; withAccount: number; withoutAccount: number };
};

export async function getDashboardOrderSummary(prisma: Pick<PrismaClient, "order">): Promise<DashboardOrderSummary> {
  const [ordersWithAccount, ordersWithoutAccount, purchasesWithAccount, purchasesWithoutAccount] = await Promise.all([
    prisma.order.count({ where: { AND: [dashboardOrdersWhere, { customerId: { not: null } }] } }),
    prisma.order.count({ where: { AND: [dashboardOrdersWhere, { customerId: null }] } }),
    prisma.order.count({ where: { AND: [dashboardPurchasesWhere, { customerId: { not: null } }] } }),
    prisma.order.count({ where: { AND: [dashboardPurchasesWhere, { customerId: null }] } }),
  ]);
  return {
    orders: { total: ordersWithAccount + ordersWithoutAccount, withAccount: ordersWithAccount, withoutAccount: ordersWithoutAccount },
    purchases: { total: purchasesWithAccount + purchasesWithoutAccount, withAccount: purchasesWithAccount, withoutAccount: purchasesWithoutAccount },
  };
}
