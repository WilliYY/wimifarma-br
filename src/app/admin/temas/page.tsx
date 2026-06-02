import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <ModulePlaceholder
      allowedRoles={adminRoutePermissions["/admin/temas"]}
      description="Area inicial para o ADM controlar visual do site sem mexer em codigo."
      title="Temas"
    >
      <AdminModuleList
        items={[
          "Trocar banner principal, videos e chamadas da home.",
          "Ajustar cores de destaque, selo de ofertas e botoes comerciais.",
          "Controlar vitrines: medicamentos, destaque, ofertas e campanhas.",
          "Preparar historico para voltar temas anteriores com seguranca.",
        ]}
      />
    </ModulePlaceholder>
  );
}
