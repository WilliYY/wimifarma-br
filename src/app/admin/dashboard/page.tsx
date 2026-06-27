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
import { cn } from "@/lib/utils";

type MetricTone =
  | "amber"
  | "blue"
  | "green"
  | "red"
  | "slate"
  | "teal"
  | "violet";

type DashboardMetric = {
  description: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  roles: AdminRole[];
  tone: MetricTone;
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

const metricToneStyles: Record<
  MetricTone,
  {
    accent: string;
    badge: string;
    border: string;
    icon: string;
    value: string;
  }
> = {
  amber: {
    accent: "bg-[#f59e0b]",
    badge: "bg-[#fff7ed] text-[#b45309]",
    border: "hover:border-[#f59e0b]/45",
    icon: "bg-[#fff7ed] text-[#b45309]",
    value: "text-[#92400e]",
  },
  blue: {
    accent: "bg-[#2563eb]",
    badge: "bg-[#eff6ff] text-[#1d4ed8]",
    border: "hover:border-[#2563eb]/40",
    icon: "bg-[#eff6ff] text-[#1d4ed8]",
    value: "text-[#1e3a8a]",
  },
  green: {
    accent: "bg-pharma-green",
    badge: "bg-[#ecfdf3] text-[#027a48]",
    border: "hover:border-pharma-green/40",
    icon: "bg-[#ecfdf3] text-[#027a48]",
    value: "text-[#065f46]",
  },
  red: {
    accent: "bg-brand",
    badge: "bg-brand-soft text-brand",
    border: "hover:border-brand/45",
    icon: "bg-brand-soft text-brand",
    value: "text-brand-strong",
  },
  slate: {
    accent: "bg-[#475467]",
    badge: "bg-[#f2f4f7] text-[#475467]",
    border: "hover:border-[#98a2b3]",
    icon: "bg-[#f2f4f7] text-[#475467]",
    value: "text-ink",
  },
  teal: {
    accent: "bg-[#0891b2]",
    badge: "bg-[#ecfeff] text-[#0e7490]",
    border: "hover:border-[#0891b2]/40",
    icon: "bg-[#ecfeff] text-[#0e7490]",
    value: "text-[#155e75]",
  },
  violet: {
    accent: "bg-[#7c3aed]",
    badge: "bg-[#f5f3ff] text-[#6d28d9]",
    border: "hover:border-[#7c3aed]/40",
    icon: "bg-[#f5f3ff] text-[#6d28d9]",
    value: "text-[#5b21b6]",
  },
};

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
        tone: "red",
        value: numberFormatter.format(totalProducts),
      },
      {
        description: "campanhas publicadas agora",
        href: "/admin/ofertas",
        icon: Gift,
        label: "Ofertas ativas",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "amber",
        value: numberFormatter.format(activeOffers),
      },
      {
        description: `${numberFormatter.format(activeCustomers)} ativos`,
        href: "/admin/clientes",
        icon: Users,
        label: "Clientes",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "blue",
        value: numberFormatter.format(totalCustomers),
      },
      {
        description: `${numberFormatter.format(activeCoupons)} cupons ativos`,
        href: "/admin/cupons",
        icon: TicketPercent,
        label: "Cupons usados",
        roles: ["ADMIN", "MANAGER"],
        tone: "violet",
        value: numberFormatter.format(couponUsage._sum.usesCount ?? 0),
      },
      {
        description: "contatos registrados",
        href: "/admin/clientes",
        icon: MessageCircle,
        label: "Pedidos via WhatsApp",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "green",
        value: numberFormatter.format(whatsappContacts),
      },
      {
        description: `${numberFormatter.format(recentSiteVisitors)} nas ultimas 24h`,
        icon: Eye,
        label: "Visitantes do site",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "teal",
        value: numberFormatter.format(siteVisitors),
      },
      {
        description: "banco e app respondendo",
        icon: Activity,
        label: "Status do sistema",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "green",
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
        tone: "slate",
        value: "Instavel",
      },
    ];
  }
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metric.icon;
  const tone = metricToneStyles[metric.tone];
  const card = (
    <Card
      className={cn(
        "group h-full overflow-hidden bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-md",
        tone.border,
      )}
    >
      <CardContent className="relative p-4">
        <span className={cn("absolute inset-x-0 top-0 h-1", tone.accent)} />
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              tone.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase",
              tone.badge,
            )}
          >
            ao vivo
          </span>
        </div>
        <p className="mt-4 text-sm font-bold leading-tight text-ink">
          {metric.label}
        </p>
        <p className={cn("mt-1 text-3xl font-black", tone.value)}>
          {metric.value}
        </p>
        <p className="mt-2 min-h-8 text-xs font-semibold leading-4 text-muted">
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

function SystemStatusCard({ metric }: { metric?: DashboardMetric }) {
  if (!metric) {
    return null;
  }

  const Icon = metric.icon;
  const isActive = metric.value.toLowerCase() === "ativo";

  return (
    <Card
      className={cn(
        "h-full overflow-hidden border-[#d0d5dd] bg-white",
        isActive && "border-[#a6f4c5] bg-[#f6fef9]",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              isActive
                ? "bg-[#dcfae6] text-[#027a48]"
                : "bg-[#f2f4f7] text-[#475467]",
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase",
              isActive
                ? "bg-[#dcfae6] text-[#027a48]"
                : "bg-[#f2f4f7] text-[#475467]",
            )}
          >
            {isActive ? "online" : "atencao"}
          </span>
        </div>

        <p className="mt-5 text-sm font-bold text-muted">Saude operacional</p>
        <p className="mt-1 text-3xl font-black text-ink">{metric.value}</p>
        <p className="mt-2 text-sm font-semibold leading-5 text-muted">
          {metric.description}
        </p>

        <div className="mt-5 grid gap-2 text-xs font-bold text-ink">
          <span className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isActive ? "bg-[#12b76a]" : "bg-[#98a2b3]",
              )}
            />
            Banco conectado
          </span>
          <span className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isActive ? "bg-[#12b76a]" : "bg-[#98a2b3]",
              )}
            />
            Aplicacao respondendo
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <Card className="mt-6 border-brand/20 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase text-brand">
              Acoes rapidas
            </p>
            <h2 className="mt-1 text-xl font-black text-ink">
              Operacao comercial do dia
            </h2>
            <p className="mt-1 text-sm text-muted">
              Atalhos para cadastrar, revisar e atender sem procurar no menu.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <Button
                  asChild
                  className="h-full min-h-16 w-full justify-start px-4 py-3"
                  key={action.label}
                  variant={action.variant ?? "secondary"}
                >
                  <Link
                    href={action.href}
                    rel={action.external ? "noreferrer" : undefined}
                    target={action.external ? "_blank" : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 text-left">
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
  const statusMetric = visibleMetrics.find(
    (metric) => metric.label === "Status do sistema",
  );
  const commercialMetrics = visibleMetrics.filter(
    (metric) => metric.label !== "Status do sistema",
  );
  const visibleActions = quickActions.filter(
    (action) => action.roles.includes(role),
  );

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/dashboard"]}
      title="Dashboard"
    >
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-brand">
                Resumo comercial
              </p>
              <h2 className="text-xl font-black text-ink">Visao do painel</h2>
            </div>
            <p className="text-sm font-semibold text-muted">
              Dados reais para decidir o proximo atendimento.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {commercialMetrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </div>

        <SystemStatusCard metric={statusMetric} />
      </section>

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
