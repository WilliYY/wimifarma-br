import type { Metadata } from "next";
import { CheckoutPage } from "@/components/site/checkout-page";
import { auth } from "@/features/auth/auth";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout | Wimifarma",
  robots: { follow: false, index: false },
};

export default async function Page() {
  const session = await auth();
  const customer =
    session?.user?.role === "CUSTOMER" && session.user.id
      ? await getPrisma().customer.findUnique({
          select: { address: true, city: true, email: true, name: true, neighborhood: true, phone: true },
          where: { id: session.user.id },
        })
      : null;

  return (
    <CheckoutPage
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
