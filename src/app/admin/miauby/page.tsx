import { AdminShell } from "@/components/admin/admin-shell";
import { MiaubyPanel } from "@/components/admin/miauby-panel";
import { renderSampleEmails } from "@/features/communications/customer-email";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
} from "@/features/auth/permissions";

export default async function Page() {
  await requireAdminPageRoute("/admin/miauby");

  return (
    <AdminShell allowedRoles={adminRoutePermissions["/admin/miauby"]} title="Miauby">
      <MiaubyPanel emailPreviews={await renderSampleEmails()} />
    </AdminShell>
  );
}
