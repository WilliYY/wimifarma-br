import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function Page() {
  return (
    <ModulePlaceholder
      description="Area inicial para criar colaboradores com acesso limitado ao trabalho comercial do dia a dia."
      title="Criar colaborador"
    >
      <AdminModuleList
        items={[
          "Criar colaborador para cadastrar produtos e atualizar precos.",
          "Permitir ativar ofertas e acompanhar pedidos para efetuar a venda.",
          "Bloquear acesso a temas, criacao de ADM e configuracoes sensiveis.",
          "Preparar niveis STAFF e MANAGER para crescer sem bagunca.",
        ]}
      />
    </ModulePlaceholder>
  );
}
