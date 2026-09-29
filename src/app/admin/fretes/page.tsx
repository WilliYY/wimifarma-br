import { AdminShell } from "@/components/admin/admin-shell";
import { ShippingPanel } from "@/components/admin/shipping-panel";
import { adminRoutePermissions, requireAdminPageRoute } from "@/features/auth/permissions";
import { shippingCallbackUrl } from "@/features/shipping/oauth";
export default async function Page() {
  await requireAdminPageRoute("/admin/fretes");
  return <AdminShell allowedRoles={adminRoutePermissions["/admin/fretes"]} title="Fretes e entregas"><ShippingPanel callbackUrl={shippingCallbackUrl()} /></AdminShell>;
}
