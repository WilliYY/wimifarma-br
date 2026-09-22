import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { ORDER_HISTORY_PAGE_SIZE, type CustomerOrderHistory, type OrderHistoryQuery } from "./customer-orders";

// Explicit customer-facing projection: no internal notes, contact data, or payment credentials.
const customerOrderSelect = {
  id: true, number: true, status: true, fulfillmentMethod: true, paymentMethod: true, paymentStatus: true,
  subtotalCents: true, deliveryFeeCents: true, totalCents: true, cashbackRedeemedCents: true,
  street: true, addressNumber: true, complement: true, neighborhood: true, city: true, state: true,
  createdAt: true, updatedAt: true,
  items: { orderBy: { createdAt: "asc" }, select: {
    id: true, productName: true, productImageUrl: true, quantity: true, unitPriceCents: true, totalCents: true,
  } },
} satisfies Prisma.OrderSelect;
type SelectedOrder = Prisma.OrderGetPayload<{ select: typeof customerOrderSelect }>;
const serialize = (order: SelectedOrder) => ({ ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() });

export async function getCustomerOrders(prisma: Pick<PrismaClient, "order">, customerId: string, query: OrderHistoryQuery): Promise<CustomerOrderHistory> {
  if (!customerId) throw new Error("Customer session required");
  const active: Prisma.OrderWhereInput = { customerId, status: { notIn: ["COMPLETED", "CANCELED"] } };
  const scopes = { all: { customerId }, active, completed: { customerId, status: "COMPLETED" }, canceled: { customerId, status: "CANCELED" } } satisfies Record<string, Prisma.OrderWhereInput>;
  const orderBy: Prisma.OrderOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];
  const [all, activeCount, completed, canceled, orders, activeOrder] = await Promise.all([
    prisma.order.count({ where: scopes.all }),
    prisma.order.count({ where: active }),
    prisma.order.count({ where: scopes.completed }),
    prisma.order.count({ where: scopes.canceled }),
    prisma.order.findMany({ where: scopes[query.filter], orderBy, select: customerOrderSelect, take: ORDER_HISTORY_PAGE_SIZE, skip: (query.page - 1) * ORDER_HISTORY_PAGE_SIZE }),
    prisma.order.findFirst({ where: active, orderBy, select: customerOrderSelect }),
  ]);
  const counts = { all, active: activeCount, completed, canceled };
  return { ...query, pageSize: ORDER_HISTORY_PAGE_SIZE, total: counts[query.filter], counts, orders: orders.map(serialize), activeOrder: activeOrder ? serialize(activeOrder) : null };
}
