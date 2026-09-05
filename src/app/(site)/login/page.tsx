import type { Metadata } from "next";
import { CustomerAuthPage } from "@/components/site/customer-auth-page";
import { getSafeCustomerCallbackUrl } from "@/features/auth/customer-redirect";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Entrar ou criar conta",
};

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = getSafeCustomerCallbackUrl(params.callbackUrl);

  return <CustomerAuthPage callbackUrl={callbackUrl} />;
}
