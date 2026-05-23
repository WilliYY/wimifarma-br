import Link from "next/link";
import {
  Activity,
  Gift,
  KeyRound,
  Package,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminChart } from "@/components/admin/admin-chart";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/features/auth/auth";

type DashboardRole = "ADMIN" | "MANAGER" | "STAFF";

type DashboardMetric = {
  href?: string;
  icon: LucideIcon;
  label: string;
  roles: DashboardRole[];
  value: string;
};

const metrics: DashboardMetric[] = [
  {
    href: "/admin/catalogos",
    icon: Package,
    label: "Catalogos",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    value: "produtos",
  },
  {
    href: "/admin/ofertas",
    icon: Gift,
    label: "Ofertas",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    value: "campanhas",
  },
  {
    href: "/admin/criar-colaborador",
    icon: Users,
    label: "Usuarios",
    roles: ["ADMIN"],
    value: "ADM/colaborador",
  },
  {
    href: "/admin/api-senhas",
    icon: KeyRound,
    label: "API e Senhas",
    roles: ["ADMIN"],
    value: "segredos",
  },
  {
    icon: Activity,
    label: "Health",
    roles: ["ADMIN", "MANAGER", "STAFF"],
    value: "ativo",
  },
];

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metric.icon;
  const card = (
    <Card className="h-full transition hover:border-brand hover:shadow-md">
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-brand" />
        <p className="mt-4 text-sm font-semibold text-muted">{metric.label}</p>
        <p className="mt-1 text-2xl font-black text-ink">{metric.value}</p>
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
  const visibleMetrics = metrics.filter(
    (metric) => role && metric.roles.includes(role),
  );

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-5">
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
