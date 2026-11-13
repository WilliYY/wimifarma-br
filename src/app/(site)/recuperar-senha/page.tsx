import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerPasswordRecovery } from "@/components/site/customer-password-recovery";
import { isPasswordRecoveryEmailConfigured } from "@/features/communications/password-recovery-email";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { follow: false, index: false },
  title: "Recuperar senha",
};

export default function Page() {
  if (!isPasswordRecoveryEmailConfigured()) redirect("/login");
  return <CustomerPasswordRecovery />;
}
