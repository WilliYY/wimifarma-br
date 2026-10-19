import { AdminShell } from "@/components/admin/admin-shell";
import { RestockPanel } from "@/components/admin/restock-panel";

export default function Page() {
  return <AdminShell allowedRoles={["ADMIN", "MANAGER"]} title="Avise-me"><RestockPanel /></AdminShell>;
}
