import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <ModulePlaceholder
      allowedRoles={adminRoutePermissions["/admin/roleta"]}
      description="Campanhas, premios, probabilidades e tentativas foram modelados para evoluir com controle."
      title="Roleta"
    />
  );
}
