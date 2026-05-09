import { AdminModuleList } from "@/components/admin/admin-module-list";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function Page() {
  return (
    <ModulePlaceholder
      description="Cashback fica como modulo futuro, com conta, saldo e transacoes ja previstas no banco."
      title="Cash Back"
    >
      <AdminModuleList
        items={[
          "Consultar contas de cashback por cliente.",
          "Criar credito, debito, ajuste e expiracao no futuro.",
          "Separar saldo aprovado de saldo pendente.",
          "Manter auditoria para qualquer ajuste manual.",
        ]}
      />
    </ModulePlaceholder>
  );
}
