import { AdminShell } from "@/components/admin/admin-shell";
import { FeaturedProductsPanel } from "@/components/admin/featured-products-panel";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
} from "@/features/auth/permissions";

export default async function Page() {
  await requireAdminPageRoute("/admin/ofertas");

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/ofertas"]}
      title="Ofertas"
    >
      <FeaturedProductsPanel />
    </AdminShell>
  );
}
