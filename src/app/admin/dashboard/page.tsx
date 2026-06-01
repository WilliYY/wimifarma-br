import Link from "next/link";
import {
  Activity,
  BadgePercent,
  Gift,
  MessageCircle,
  Package,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminChart } from "@/components/admin/admin-chart";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/features/auth/auth";
import { getPrisma } from "@/lib/prisma";

type DashboardRole = "ADMIN" | "MANAGER" | "STAFF";

type DashboardMetric = {
  description: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  roles: DashboardRole[];
  value: string;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

async function getDashboardMetrics(): Promise<DashboardMetric[]> {
  const prisma = getPrisma();
  const now = new Date();

  try {
    const [
      totalProducts,
      activeProducts,
      activeOffers,
      totalCustomers,
      activeCustomers,
      activeCoupons,
      couponUsage,
      whatsappContacts,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.offer.count({
        where: {
          status: "ACTIVE",
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
      }),
      prisma.customer.count(),
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.coupon.count({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
      }),
      prisma.coupon.aggregate({ _sum: { usesCount: true } }),
      prisma.whatsAppContact.count(),
    ]);

    return [
      {
        description: `${numberFormatter.format(activeProducts)} ativos`,
        href: "/admin/catalogos",
        icon: Package,
        label: "Produtos cadastrados",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        value: numberFormatter.format(totalProducts),
      },
      {
        description: "campanhas publicadas agora",
        href: "/admin/ofertas",
        icon: Gift,
        label: "Ofertas ativas",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        value: numberFormatter.format(activeOffers),
      },
      {
        description: `${numberFormatter.format(activeCustomers)} ativos`,
        href: "/admin/clientes",
        icon: Users,
        label: "Clientes",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        value: numberFormatter.format(totalCustomers),
      },
      {
        description: `${numberFormatter.format(activeCoupons)} cupons ativos`,
        href: "/admin/cupons",
        icon: TicketPercent,
        label: "Cupons usados",
        roles: ["ADMIN", "MANAGER"],
        value: numberFormatter.format(couponUsage._sum.usesCount ?? 0),
      },
      {
        description: "contatos registrados",
        href: "/admin/clientes",
        icon: MessageCircle,
        label: "Pedidos via WhatsApp",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        value: numberFormatter.format(whatsappContacts),
      },
      {
        description: "banco e app respondendo",
        icon: Activity,
        label: "Status do sistema",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        value: "Ativo",
      },
    ];
  } catch (error) {
    console.error("Erro ao carregar metricas do dashboard", error);

    return [
      {
        description: "verifique DATABASE_URL e Prisma",
        icon: BadgePercent,
        label: "Status do sistema",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        value: "Instavel",
      },
    ];
  }
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metric.icon;
  const card = (
    <Card className="h-full transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon className="h-5 w-5" />
          </span>
          <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-[#027a48]">
            real
          </span>
        </div>
        <p className="mt-4 text-sm font-semibold text-muted">{metric.label}</p>
        <p className="mt-1 text-3xl font-black text-ink">{metric.value}</p>
        <p className="mt-2 text-xs font-semibold text-muted">
          {metric.description}
        </p>
      </CardContent>
    </Card>
  );

  if (!metric.href) {
    return card;
  }

  return (
    <Link className="block h-full" href={metric.href}>
      {card}
    </Link>
  );
}

export default async function Page() {
  const session = await auth();
  const role = session?.user.role as DashboardRole | undefined;
  const metrics = await getDashboardMetrics();
  const visibleMetrics = metrics.filter(
    (metric) => role && metric.roles.includes(role),
  );

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {visibleMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-black text-ink">Interesse comercial</h2>
            <p className="mt-1 text-sm text-muted">
              Exemplo visual com Recharts. Dados reais entram depois.
            </p>
            <AdminChart />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-black text-ink">Roadmap modular</h2>
            <p className="mt-1 text-sm text-muted">
              Tabela usando TanStack Table para o painel crescer.
            </p>
            <div className="mt-5">
              <AdminDataTable />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
