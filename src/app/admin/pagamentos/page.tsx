import { AdminShell } from "@/components/admin/admin-shell";
import { PaymentPanel } from "@/components/admin/payment-panel";
import { adminRoutePermissions, requireAdminPageRoute } from "@/features/auth/permissions";
export default async function Page() {
  await requireAdminPageRoute("/admin/pagamentos");
  return <AdminShell allowedRoles={adminRoutePermissions["/admin/pagamentos"]} title="Pagamentos"><PaymentPanel /></AdminShell>;
}
