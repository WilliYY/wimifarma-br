import { AdminShell } from "@/components/admin/admin-shell";
import { CotefacilEanPanel } from "@/components/admin/cotefacil-ean-panel";
import { SupplierPlanningPanel } from "@/components/admin/supplier-planning-panel";
import { adminRoutePermissions, requireAdminPageRoute } from "@/features/auth/permissions";

export default async function Page() {
  await requireAdminPageRoute("/admin/fornecedores");

  return (
    <AdminShell allowedRoles={adminRoutePermissions["/admin/fornecedores"]} title="Fornecedores e viabilidade">
      <div className="space-y-6">
        <CotefacilEanPanel />
        <SupplierPlanningPanel />
      </div>
    </AdminShell>
  );
}
