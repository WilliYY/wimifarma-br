import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerAccountPanel } from "@/components/site/customer-account-panel";
import { auth } from "@/features/auth/auth";
import { getCustomerCashback } from "@/features/cashback/service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Minha conta",
};

export default async function MinhaContaPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "CUSTOMER") {
    redirect("/admin/dashboard");
  }

  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({
    where: { id: session.user.id, status: "ACTIVE" },
  });

  if (!customer) {
    redirect("/login");
  }

  const cashback = await prisma.$transaction((tx) => getCustomerCashback(tx, customer.id), { isolationLevel: "RepeatableRead" });

  return (
    <CustomerAccountPanel
      cashback={cashback}
      customer={{
        address: customer.address,
        city: customer.city,
        createdAt: customer.createdAt.toISOString(),
        email: customer.email,
        hasGoogle: Boolean(customer.googleSubject),
        hasPassword: Boolean(customer.passwordHash),
        id: customer.id,
        imageUrl: customer.imageUrl,
        lastLoginAt: customer.lastLoginAt?.toISOString() ?? null,
        name: customer.name,
        neighborhood: customer.neighborhood,
        notes: customer.notes,
        passwordSetAt: customer.passwordSetAt?.toISOString() ?? null,
        phone: customer.phone,
      }}
    />
  );
}
