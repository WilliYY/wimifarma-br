import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <ModulePlaceholder
      allowedRoles={adminRoutePermissions["/admin/configuracoes"]}
      description="Espaco reservado para horarios, WhatsApp, banners, limites promocionais e preferencias internas."
      title="Configuracoes"
    />
  );
}
