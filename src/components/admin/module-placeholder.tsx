import { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminRole } from "@/features/auth/permissions";

type ModulePlaceholderProps = {
  allowedRoles: readonly AdminRole[];
  children?: ReactNode;
  description: string;
  title: string;
};

export function ModulePlaceholder({
  allowedRoles,
  children,
  description,
  title,
}: ModulePlaceholderProps) {
  return (
    <AdminShell allowedRoles={allowedRoles} title={title}>
      <Card>
        <CardContent className="p-6">
          <Badge>Modulo reservado</Badge>
          <h2 className="mt-5 text-2xl font-black text-ink">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            {description}
          </p>
          <div className="mt-6 grid gap-3 text-sm text-muted sm:grid-cols-3">
            <div className="rounded-lg bg-surface-subtle p-4">
              Schema Prisma pronto
            </div>
            <div className="rounded-lg bg-surface-subtle p-4">
              API reservada criada
            </div>
            <div className="rounded-lg bg-surface-subtle p-4">
              UI final entra por etapa
            </div>
          </div>
          {children}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
