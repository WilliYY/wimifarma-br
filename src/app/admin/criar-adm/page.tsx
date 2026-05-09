import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function Page() {
  return (
    <ModulePlaceholder
      description="Area inicial para o administrador criar outros ADMs, ativar ou bloquear acessos e acompanhar usuarios com permissao total."
      title="Criar ADM"
    >
      <AdminModuleList
        items={[
          "Criar usuario administrador com nome, email e senha temporaria.",
          "Listar ADMs ativos, bloqueados e ultimo acesso.",
          "Permissao total: usuarios, temas, catalogos, ofertas, cupons, cashback e Club Wimifarma.",
          "Registro futuro em AuditLog para cada alteracao critica.",
        ]}
      />
    </ModulePlaceholder>
  );
}
