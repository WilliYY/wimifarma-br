import type { CustomerOrder, CustomerOrderHistory, OrderHistoryFilter } from "../../src/features/orders/customer-orders";

// Synthetic fixtures only. No database access, customer records, or commercial writes.
export const accountOrders: CustomerOrder[] = Array.from({ length: 9 }, (_, index) => ({
  id: `qa-order-${index}`, number: `WF-TESTE-${100 + index}`,
  status: index === 0 ? "PREPARING" : index === 1 ? "READY" : index === 8 ? "CANCELED" : "COMPLETED",
  fulfillmentMethod: index === 1 ? "PICKUP" : "DELIVERY", paymentMethod: "PIX", paymentStatus: index < 2 ? "PENDING" : index === 8 ? "REFUNDED" : "PAID",
  subtotalCents: 2580, deliveryFeeCents: index === 1 ? 0 : 500, totalCents: index === 1 ? 2480 : 2980, cashbackRedeemedCents: 100,
  street: "Rua de Teste", addressNumber: "123", complement: null, neighborhood: "Bairro Exemplo", city: "Ivaté", state: "PR",
  createdAt: "2026-09-20T12:00:00.000Z", updatedAt: "2026-09-21T14:30:00.000Z",
  items: [{ id: `item-${index}`, productName: "Dove Original · produto de demonstração", productImageUrl: "/banners/products/dove-original.webp", quantity: 2, unitPriceCents: 1290, totalCents: 2580 }],
}));

export function accountHistory(page = 1, filter: OrderHistoryFilter = "all", empty = false): CustomerOrderHistory {
  const orders = empty ? [] : accountOrders;
  const scoped = orders.filter(order => filter === "all" || (filter === "active" ? !["COMPLETED", "CANCELED"].includes(order.status) : order.status === (filter === "completed" ? "COMPLETED" : "CANCELED")));
  return { page, filter, pageSize: 8, total: scoped.length, orders: scoped.slice((page - 1) * 8, page * 8), activeOrder: orders[0] ?? null, counts: { all: orders.length, active: empty ? 0 : 2, completed: empty ? 0 : 6, canceled: empty ? 0 : 1 } };
}

export const accountCustomer = { id: "qa-customer", name: "Ana Cliente", email: "ana@example.com", phone: "44999990000", address: null, neighborhood: null, city: "Ivaté", notes: null, hasGoogle: true, hasPassword: false, imageUrl: null, createdAt: "2026-08-01T12:00:00.000Z", lastLoginAt: "2026-09-20T15:00:00.000Z", passwordSetAt: null };
export const accountCashback = { balance: "12.50", pendingCents: 120, reservedCents: 100, lifetimeEarned: "18.50", lifetimeRedeemed: "6", transactions: [{ id: "qa-credit", amount: "2.50", createdAt: "2026-09-20T12:00:00.000Z", description: "Cashback da compra de demonstração", type: "CREDIT" }] };
