import Link from "next/link";
import {
  Activity,
  BadgePercent,
  Boxes,
  ExternalLink,
  Gift,
  Eye,
  MessageCircle,
  Package,
  Plus,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminChart } from "@/components/admin/admin-chart";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  adminRoutePermissions,
  requireAdminPageRoute,
  type AdminRole,
} from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";

type DashboardMetric = {
  description: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  roles: AdminRole[];
  value: string;
};

type DashboardAction = {
  description: string;
  external?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  roles: AdminRole[];
  variant?: "default" | "secondary" | "success";
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

const quickActions: DashboardAction[] = [
  {
    description: "Criar ou revisar campanha comercial",
    href: "/admin/ofertas",
    icon: Gift,
    label: "Nova oferta",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    variant: "default",
  },
  {
    description: "Cadastrar item, preco e estoque",
    href: "/admin/catalogos",
    icon: Boxes,
    label: "Novo produto",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    variant: "secondary",
  },
  {
    description: "Preparar desconto para campanhas",
    href: "/admin/cupons",
    icon: TicketPercent,
    label: "Criar cupom",
    roles: ["ADMIN", "MANAGER"],
    variant: "secondary",
  },
  {
    description: "Consultar base e leads",
    href: "/admin/clientes",
    icon: Users,
    label: "Ver clientes",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    variant: "secondary",
  },
  {
    description: "Abrir atendimento em nova aba",
    external: true,
    href: siteConfig.whatsappUrl,
    icon: MessageCircle,
    label: "Abrir WhatsApp",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    variant: "success",
  },
];

async function getDashboardMetrics(): Promise<DashboardMetric[]> {
  const prisma = getPrisma();
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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
      siteVisitors,
      recentSiteVisitors,
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
      prisma.siteVisit.count(),
      prisma.siteVisit.count({ where: { lastSeenAt: { gte: last24Hours } } }),
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
        description: `${numberFormatter.format(recentSiteVisitors)} nas ultimas 24h`,
        icon: Eye,
        label: "Visitantes do site",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        value: numberFormatter.format(siteVisitors),
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

function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <Card className="mt-5 border-brand/15 bg-white">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">
              Acoes rapidas
            </p>
            <h2 className="mt-1 text-xl font-black text-ink">
              Operacao comercial do dia
            </h2>
            <p className="mt-1 text-sm text-muted">
              Atalhos para cadastrar, revisar e atender sem procurar no menu.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <Button
                  asChild
                  className="h-auto justify-start px-4 py-3 xl:min-w-44"
                  key={action.label}
                  variant={action.variant ?? "secondary"}
                >
                  <Link
                    href={action.href}
                    rel={action.external ? "noreferrer" : undefined}
                    target={action.external ? "_blank" : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 text-left">
                      <span className="block font-black leading-5">
                        {action.label}
                      </span>
                      <span className="block whitespace-normal text-xs font-medium opacity-80">
                        {action.description}
                      </span>
                    </span>
                    {action.external ? (
                      <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Plus className="ml-auto h-3.5 w-3.5 shrink-0" />
                    )}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function Page() {
  const { role } = await requireAdminPageRoute("/admin/dashboard");
  const metrics = await getDashboardMetrics();
  const visibleMetrics = metrics.filter(
    (metric) => metric.roles.includes(role),
  );
  const visibleActions = quickActions.filter(
    (action) => action.roles.includes(role),
  );

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/dashboard"]}
      title="Dashboard"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {visibleMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <QuickActions actions={visibleActions} />

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
