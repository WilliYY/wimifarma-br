import { AdminShell } from "@/components/admin/admin-shell";
import { SupplierPlanningPanel } from "@/components/admin/supplier-planning-panel";
import { adminRoutePermissions, requireAdminPageRoute } from "@/features/auth/permissions";

export default async function Page() {
  await requireAdminPageRoute("/admin/fornecedores");
  return <AdminShell allowedRoles={adminRoutePermissions["/admin/fornecedores"]} title="Fornecedores e viabilidade"><SupplierPlanningPanel /></AdminShell>;
}
