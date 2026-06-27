import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
} from "@/features/auth/permissions";

export default async function Page() {
  await requireAdminPageRoute("/admin/criar-colaborador");

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/criar-colaborador"]}
      title="Criar colaborador"
    >
      <AdminUsersPanel
        createButtonLabel="Criar colaborador"
        description="Crie acessos limitados para a operacao comercial sem liberar configuracoes sensiveis."
        roleOptions={[
          {
            description:
              "pode operar catalogos, produtos, ofertas, clientes e dashboard.",
            label: "Colaborador",
            value: "STAFF",
          },
          {
            description:
              "inclui operacao comercial e tambem cupons e roleta preparada.",
            label: "Gerente",
            value: "MANAGER",
          },
        ]}
        title="Novo colaborador"
      />
    </AdminShell>
  );
}
