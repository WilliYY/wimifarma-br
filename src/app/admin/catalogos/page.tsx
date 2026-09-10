import { ProductsCatalogPanel } from "@/components/admin/products-catalog-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminRoutePermissions, requireAdminPageRoute } from "@/features/auth/permissions";

export default async function Page() {
  const { role } = await requireAdminPageRoute("/admin/catalogos");
  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/catalogos"]}
      title="Produtos / Catálogo"
    >
      <ProductsCatalogPanel canManageCashback={role === "ADMIN"} />
    </AdminShell>
  );
}
