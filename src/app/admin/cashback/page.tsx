import { AdminShell } from "@/components/admin/admin-shell";
import { CashbackPanel } from "@/components/admin/cashback-panel";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/cashback"]}
      title="Cashback"
    >
      <CashbackPanel />
    </AdminShell>
  );
}
