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
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react";
import { OnlineVisitorsCard } from "@/components/admin/online-visitors-card";
import { AdminShell } from "@/components/admin/admin-shell";
import { getDashboardOrderSummary } from "@/features/analytics/dashboard-metrics";
import { getOnlineVisitorSummary } from "@/features/analytics/online-presence";
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
    border: string;
    icon: string;
    value: string;
  }
> = {
  amber: {
    accent: "bg-[#f59e0b]",
    border: "hover:border-[#f59e0b]/45",
    icon: "bg-[#fff7ed] text-[#b45309]",
    value: "text-[#92400e]",
  },
  blue: {
    accent: "bg-[#2563eb]",
    border: "hover:border-[#2563eb]/40",
    icon: "bg-[#eff6ff] text-[#1d4ed8]",
    value: "text-[#1e3a8a]",
  },
  green: {
    accent: "bg-pharma-green",
    border: "hover:border-pharma-green/40",
    icon: "bg-[#ecfdf3] text-[#027a48]",
    value: "text-[#065f46]",
  },
  red: {
    accent: "bg-brand",
    border: "hover:border-brand/45",
    icon: "bg-brand-soft text-brand",
    value: "text-brand-strong",
  },
  teal: {
    accent: "bg-[#0891b2]",
    border: "hover:border-[#0891b2]/40",
    icon: "bg-[#ecfeff] text-[#0e7490]",
    value: "text-[#155e75]",
  },
  violet: {
    accent: "bg-[#7c3aed]",
    border: "hover:border-[#7c3aed]/40",
    icon: "bg-[#f5f3ff] text-[#6d28d9]",
    value: "text-[#5b21b6]",
  },
};

const quickActions: DashboardAction[] = [
  {
    href: "/admin/ofertas",
    icon: Gift,
    label: "Nova oferta",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    variant: "default",
  },
  {
    href: "/admin/catalogos",
    icon: Boxes,
    label: "Novo produto",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    variant: "secondary",
  },
  {
    href: "/admin/cupons",
    icon: TicketPercent,
    label: "Criar cupom",
    roles: ["ADMIN", "MANAGER"],
    variant: "secondary",
  },
  {
    href: "/admin/clientes",
    icon: Users,
    label: "Ver clientes",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    variant: "secondary",
  },
  {
    external: true,
    href: siteConfig.whatsappUrl,
    icon: MessageCircle,
    label: "Abrir WhatsApp",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    variant: "success",
  },
];

async function getDashboardMetrics(now: Date): Promise<DashboardMetric[] | null> {
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const prisma = getPrisma();
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
      orderSummary,
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
      prisma.siteVisit.count({ where: { lastSeenAt: { gte: last24Hours, lte: now } } }),
      getDashboardOrderSummary(prisma),
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
        description: "Campanhas publicadas e vigentes",
        href: "/admin/ofertas",
        icon: Gift,
        label: "Campanhas ativas",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "amber",
        value: numberFormatter.format(activeOffers),
      },
      {
        description: `${numberFormatter.format(activeCustomers)} cadastros habilitados`,
        href: "/admin/clientes",
        icon: Users,
        label: "Clientes cadastrados",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "blue",
        value: numberFormatter.format(totalCustomers),
      },
      {
        description: `${numberFormatter.format(activeCoupons)} cupons habilitados e vigentes`,
        href: "/admin/cupons",
        icon: TicketPercent,
    label: "Usos informados de cupons",
        roles: ["ADMIN", "MANAGER"],
        tone: "violet",
        value: numberFormatter.format(couponUsage._sum.usesCount ?? 0),
      },
      {
        description: "Contatos registrados no sistema",
        href: "/admin/clientes",
        icon: MessageCircle,
        label: "Contatos via WhatsApp",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "green",
        value: numberFormatter.format(whatsappContacts),
      },
      {
        description: `${numberFormatter.format(recentSiteVisitors)} nas últimas 24 h`,
        icon: Eye,
        label: "Navegadores registrados",
        roles: ["ADMIN", "MANAGER", "STAFF"],
        tone: "teal",
        value: numberFormatter.format(siteVisitors),
      },
      {
        description: `${numberFormatter.format(orderSummary.orders.withAccount)} com conta vinculada · ${numberFormatter.format(orderSummary.orders.withoutAccount)} sem conta vinculada`,
        href: "/admin/pedidos",
        icon: Package,
        label: "Pedidos registrados",
        roles: [...adminRoutePermissions["/admin/pedidos"]],
        tone: "blue",
        value: numberFormatter.format(orderSummary.orders.total),
      },
      {
        description: `${numberFormatter.format(orderSummary.purchases.withAccount)} com conta vinculada · ${numberFormatter.format(orderSummary.purchases.withoutAccount)} sem conta vinculada`,
        href: "/admin/pedidos",
        icon: BadgePercent,
        label: "Compras concluídas e pagas",
        roles: [...adminRoutePermissions["/admin/pedidos"]],
        tone: "green",
        value: numberFormatter.format(orderSummary.purchases.total),
      },
    ];
  } catch (error) {
    console.error("Erro ao carregar metricas do dashboard", error);

    return null;
  }
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metric.icon;
  const tone = metricToneStyles[metric.tone];
  const card = (
    <Card className={cn("h-full overflow-hidden bg-white transition-colors", tone.border)}>
      <CardContent className="relative flex h-full items-start gap-2.5 p-3 sm:gap-3">
        <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-0.5", tone.accent)} />
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone.icon)}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-ink">{metric.label}</p>
          <p className={cn("mt-0.5 text-2xl font-black leading-tight tabular-nums", tone.value)}>
            {metric.value}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted">{metric.description}</p>
        </div>
      </CardContent>
    </Card>
  );

  return metric.href ? (
    <Link
      className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      href={metric.href}
    >
      {card}
    </Link>
  ) : card;
}

function SystemStatusCard({ available }: { available: boolean }) {
  return (
    <Card className="border-[#d0d5dd] bg-white">
      <CardContent className="flex items-start gap-2.5 p-3">
        <span className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          available ? "bg-[#dcfae6] text-[#027a48]" : "bg-amber-100 text-amber-900",
        )}>
          <Activity aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink">Consulta ao banco</h2>
          <p className="mt-0.5 text-sm font-semibold text-ink">
            {available ? "Consultas concluídas" : "Resumo indisponível"}
          </p>
          {available && (
            <p className="mt-0.5 text-xs leading-snug text-muted">
              Pagamentos e frete não foram verificados.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <nav aria-label="Ações rápidas" className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Button
            asChild
            className="min-h-11 justify-start px-3"
            key={action.label}
            variant={action.variant ?? "secondary"}
          >
            <Link
              href={action.href}
              rel={action.external ? "noreferrer" : undefined}
              target={action.external ? "_blank" : undefined}
            >
              <Icon aria-hidden="true" className="size-4" />
              {action.label}
              {action.external && (
                <>
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                  <span className="sr-only">(abre em nova aba)</span>
                </>
              )}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

async function getDashboardOnlineSummary() {
  try {
    return await getOnlineVisitorSummary(getPrisma());
  } catch (error) {
    console.error("Erro ao consultar presença online do dashboard", error);
    return null;
  }
}

export default async function Page() {
  const { role } = await requireAdminPageRoute("/admin/dashboard");
  const now = new Date();
  const [metrics, onlineSummary] = await Promise.all([
    getDashboardMetrics(now),
    getDashboardOnlineSummary(),
  ]);
  const visibleMetrics = metrics?.filter((metric) => metric.roles.includes(role));
  const visibleActions = quickActions.filter((action) => action.roles.includes(role));

  return (
    <AdminShell
      allowedRoles={adminRoutePermissions["/admin/dashboard"]}
      title="Dashboard"
    >
      <div className="space-y-4">
        <QuickActions actions={visibleActions} />

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <section aria-labelledby="dashboard-summary-title" className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="dashboard-summary-title" className="text-lg font-black text-ink">Resumo comercial</h2>
              {metrics && (
                <p className="text-xs text-muted">
                  Consultado em{" "}
                  <time dateTime={now.toISOString()}>
                    {now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </time>
                  {" "}(Brasília)
                </p>
              )}
            </div>
            {visibleMetrics && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {visibleMetrics.map((metric) => (
                  <MetricCard key={metric.label} metric={metric} />
                ))}
              </div>
            )}
          </section>

          <div className="grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <OnlineVisitorsCard
              initialCount={onlineSummary?.online ?? null}
              measuredAt={onlineSummary?.measuredAt ?? now.toISOString()}
            />
            <SystemStatusCard available={metrics !== null} />
          </div>
        </div>

        {metrics && (
          <p className="max-w-4xl text-xs leading-relaxed text-muted">
            Pedidos incluem todos os estados, exceto pagamentos online de teste. Compras exigem conclusão e pagamento confirmado.
            Pagamentos online em produção também precisam estar sem revisão, disputa ou estorno.
            Sem conta vinculada não comprova compra sem login: uma conta excluída pode desvincular o pedido.
            Os totais comerciais são atualizados ao recarregar a página.
          </p>
        )}
      </div>
    </AdminShell>
  );
}
