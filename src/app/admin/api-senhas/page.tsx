import { AdminShell } from "@/components/admin/admin-shell";
import { SecretVaultPanel } from "@/components/admin/secret-vault-panel";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
} from "@/features/auth/permissions";

export default async function Page() {
  await requireAdminPageRoute("/admin/api-senhas");

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/api-senhas"]}
      title="API e Senhas"
    >
      <SecretVaultPanel />
    </AdminShell>
  );
}
