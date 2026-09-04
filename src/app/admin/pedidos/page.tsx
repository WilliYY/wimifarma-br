import { AdminShell } from "@/components/admin/admin-shell";
import { OrdersPanel, type AdminOrderRecord } from "@/components/admin/orders-panel";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
} from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  await requireAdminPageRoute("/admin/pedidos");
  const orders = await getPrisma().order.findMany({
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = orders.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    privacyConsentAt: order.privacyConsentAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  })) satisfies AdminOrderRecord[];

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/pedidos"]}
      title="Pedidos"
    >
      <OrdersPanel initialOrders={serialized} />
    </AdminShell>
  );
}
