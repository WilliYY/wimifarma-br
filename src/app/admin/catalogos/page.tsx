import { ProductsCatalogPanel } from "@/components/admin/products-catalog-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/catalogos"]}
      title="Catalogos"
    >
      <ProductsCatalogPanel />
    </AdminShell>
  );
}
