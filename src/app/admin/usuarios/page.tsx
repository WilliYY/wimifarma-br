import { AdminShell } from "@/components/admin/admin-shell";
import { UserDirectory } from "@/components/admin/user-directory";
import { requireAdminPageRoute } from "@/features/auth/permissions";

export const dynamic = "force-dynamic";
export default async function Page() {
  const { session } = await requireAdminPageRoute("/admin/usuarios");
  return <AdminShell allowedRoles={["ADMIN"]} title="Usuarios Wimifarma"><UserDirectory actorId={session.user.id} /></AdminShell>;
}
