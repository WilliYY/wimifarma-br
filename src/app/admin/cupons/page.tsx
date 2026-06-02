import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { adminRoutePermissions } from "@/features/auth/permissions";

export default function Page() {
  return (
    <ModulePlaceholder
      allowedRoles={adminRoutePermissions["/admin/cupons"]}
      description="Cupons preparados para desconto percentual, valor fixo, entrega gratis, validade e limite de uso."
      title="Cupons"
    >
      <AdminModuleList
        items={[
          "Criar cupom percentual, valor fixo ou condicao especial.",
          "Definir validade, limite de uso e valor minimo.",
          "Vincular cupons a campanhas futuras.",
          "Preparar integracao com roleta somente no fluxo correto.",
        ]}
      />
    </ModulePlaceholder>
  );
}
