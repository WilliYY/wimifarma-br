import { Activity, Gift, Package, Users } from "lucide-react";
import { AdminChart } from "@/components/admin/admin-chart";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  { icon: Package, label: "Catalogos", value: "produtos" },
  { icon: Gift, label: "Ofertas", value: "campanhas" },
  { icon: Users, label: "Usuarios", value: "ADM/colaborador" },
  { icon: Activity, label: "Health", value: "ativo" },
];

export default function Page() {
  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.label}>
              <CardContent className="p-5">
                <Icon className="h-5 w-5 text-brand" />
                <p className="mt-4 text-sm font-semibold text-muted">
                  {metric.label}
                </p>
                <p className="mt-1 text-2xl font-black text-ink">
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
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
