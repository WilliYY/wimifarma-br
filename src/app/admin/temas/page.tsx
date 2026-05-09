import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function Page() {
  return (
    <ModulePlaceholder
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
