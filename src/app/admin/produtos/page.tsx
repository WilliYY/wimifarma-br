import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <ModulePlaceholder
      allowedRoles={adminRoutePermissions["/admin/produtos"]}
      description="Esta rota antiga continua disponivel, mas o menu principal agora usa Catalogos."
      title="Catalogos"
    />
  );
}
