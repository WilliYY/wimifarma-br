import { redirect } from "next/navigation";
import { CustomerAccountPanel } from "@/components/site/customer-account-panel";
import { auth } from "@/features/auth/auth";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    include: {
      cashbackAccount: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      },
    },
    where: { id: session.user.id },
  });

  if (!customer) {
    redirect("/login");
  }

  return (
    <CustomerAccountPanel
      cashback={
        customer.cashbackAccount
          ? {
              balance: customer.cashbackAccount.balance.toString(),
              lifetimeEarned: customer.cashbackAccount.lifetimeEarned.toString(),
              lifetimeRedeemed:
                customer.cashbackAccount.lifetimeRedeemed.toString(),
              transactions: customer.cashbackAccount.transactions.map(
                (transaction) => ({
                  amount: transaction.amount.toString(),
                  createdAt: transaction.createdAt.toISOString(),
                  description: transaction.description,
                  id: transaction.id,
                  type: transaction.type,
                }),
              ),
            }
          : null
      }
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
