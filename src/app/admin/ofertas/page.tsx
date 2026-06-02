import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <ModulePlaceholder
      allowedRoles={adminRoutePermissions["/admin/ofertas"]}
      description="CRUD de ofertas preparado para titulo, slug, preco, validade, destaque e texto de WhatsApp."
      title="Ofertas"
    >
      <AdminModuleList
        items={[
          "Criar oferta com preco, validade e produto vinculado.",
          "Ativar ou pausar campanhas de destaque na home.",
          "Colaborador pode ativar ofertas operacionais.",
          "ADM aprova regras, temas e exibicao final.",
        ]}
      />
    </ModulePlaceholder>
  );
}
