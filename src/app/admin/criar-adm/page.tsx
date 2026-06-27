import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
} from "@/features/auth/permissions";

export default async function Page() {
  await requireAdminPageRoute("/admin/criar-adm");

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/criar-adm"]}
      title="Criar ADM"
    >
      <AdminUsersPanel
        createButtonLabel="Criar ADM"
        description="Crie um administrador com permissao total. Use uma senha temporaria forte e peca para trocar depois."
        roleOptions={[
          {
            description:
              "acesso total ao painel, usuarios, credenciais, temas, configuracoes e modulos comerciais.",
            label: "Administrador total",
            value: "ADMIN",
          },
        ]}
        title="Novo administrador"
      />
    </AdminShell>
  );
}
