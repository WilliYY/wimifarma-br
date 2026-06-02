import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <ModulePlaceholder
      allowedRoles={adminRoutePermissions["/admin/clientes"]}
      description="Base para clientes e leads sem dados reais nesta etapa inicial."
      title="Clientes"
    />
  );
}
