import { AdminShell } from "@/components/admin/admin-shell";
import { OrdersPanel, type AdminOrderRecord } from "@/components/admin/orders-panel";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
} from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { resolveOrderItemEan } from "@/features/orders/admin-supply";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const { role } = await requireAdminPageRoute("/admin/pedidos");
  const orders = await getPrisma().order.findMany({
    where: { OR: [
      { onlinePayment: { is: null } },
      { onlinePayment: { is: { environment: { not: "test" } } } },
    ] },
    include: {
      ...(role === "ADMIN" ? { prescriptionUpload: { select: { id: true } } } : {}),
      onlinePayment: { select: { environment: true, status: true, statusDetail: true, providerOrderId: true } },
      itemShortages: { include: { orderItem: { select: { productName: true } } }, orderBy: { createdAt: "asc" } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { product: { select: { ean: true } }, supplierOffer: { select: { supplier: true, eanNormalized: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = orders.map((order) => ({
    ...order,
    itemShortages: order.itemShortages.map(shortage => ({
      id: shortage.id, orderItemId: shortage.orderItemId, productName: shortage.orderItem.productName,
      quantity: shortage.quantity, cashPaidCents: shortage.cashPaidCents, cashbackReturnCents: shortage.cashbackReturnCents,
      wimicoinsReturnPoints: shortage.wimicoinsReturnPoints, storeCreditReturnCents: shortage.storeCreditReturnCents,
      status: shortage.status, creditState: shortage.creditState, version: shortage.version,
      createdAt: shortage.createdAt.toISOString(), decidedAt: shortage.decidedAt?.toISOString() ?? null,
    })),
    createdAt: order.createdAt.toISOString(),
    privacyConsentAt: order.privacyConsentAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    prescriptionReviewedAt: order.prescriptionReviewedAt?.toISOString() ?? null,
    preparationReadyAt: order.preparationReadyAt?.toISOString() ?? null,
    items: order.items.map(({ product, supplierOffer, ...item }) => ({
      ...item, ...resolveOrderItemEan({ ...item, product, supplierOffer }), createdAt: item.createdAt.toISOString(),
    })),
  })) satisfies AdminOrderRecord[];
  const miauby = role === "ADMIN" ? await getPrisma().miaubyConfig.findUnique({ where: { id: "commerce" }, select: { enabled: true, orderAlerts: true } }) : null;

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/pedidos"]}
      title="Pedidos"
    >
      <OrdersPanel initialOrders={serialized} canManageCredits={role === "ADMIN"} miaubyOrderAlertsEnabled={role === "ADMIN" ? Boolean(miauby?.enabled && miauby.orderAlerts) : undefined} />
    </AdminShell>
  );
}
