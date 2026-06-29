import { AdminShell } from "@/components/admin/admin-shell";
import { CouponsPanel } from "@/components/admin/coupons-panel";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
} from "@/features/auth/permissions";

export default async function Page() {
  await requireAdminPageRoute("/admin/cupons");

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/cupons"]}
      title="Cupons"
    >
      <CouponsPanel />
    </AdminShell>
  );
}
