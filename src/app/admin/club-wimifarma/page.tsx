import { AdminShell } from "@/components/admin/admin-shell";
import { ClubPanel } from "@/components/admin/club-panel";

export default function Page() {
  return (
    <AdminShell allowedRoles={["ADMIN"]} title="Club Wimifarma">
      <ClubPanel />
    </AdminShell>
  );
}
