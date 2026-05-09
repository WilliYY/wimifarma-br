import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function Page() {
  return (
    <ModulePlaceholder
      description="Base do programa de relacionamento para clientes, recompensas e comunicacao futura."
      title="Club Wimifarma"
    >
      <AdminModuleList
        items={[
          "Visualizar clientes cadastrados e status do clube.",
          "Preparar campanhas por recorrencia, aniversario e categorias.",
          "Conectar cashback futuro e cupons personalizados.",
          "Separar dados reais somente quando as regras finais estiverem prontas.",
        ]}
      />
    </ModulePlaceholder>
  );
}
