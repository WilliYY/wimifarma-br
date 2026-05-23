import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { SecretVaultPanel } from "@/components/admin/secret-vault-panel";
import { auth } from "@/features/auth/auth";

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <AdminShell title="API e Senhas">
      <SecretVaultPanel />
    </AdminShell>
  );
}
