import type { Metadata } from "next";
import { CheckoutPage } from "@/components/site/checkout-page";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout",
  robots: { follow: false, index: false },
};

export default async function Page() {
  const session = await auth();
  const customerId = sessionCustomerId(session);
  const customer =
    customerId
      ? await getPrisma().customer.findUnique({
          select: { address: true, city: true, email: true, name: true, neighborhood: true, phone: true },
          where: { id: customerId, status: "ACTIVE" },
        })
      : null;

  return (
    <CheckoutPage
      isCustomer={Boolean(customer)}
      draftOwner={session?.user?.id ? `${session.user.role}:${session.user.id}` : "guest"}
      initialCustomer={{
        email: customer?.email ?? session?.user?.email ?? "",
        name: customer?.name ?? session?.user?.name ?? "",
        phone: customer?.phone ?? "",
        street: customer?.address ?? "",
        neighborhood: customer?.neighborhood ?? "",
      }}
    />
  );
}
