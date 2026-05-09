import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgePercent,
  Boxes,
  ChartNoAxesCombined,
  Crown,
  LogOut,
  MessageCircle,
  Palette,
  ShieldPlus,
  TicketPercent,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/features/auth/auth";

const adminNav = [
  {
    href: "/admin/criar-adm",
    icon: ShieldPlus,
    label: "Criar ADM",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/criar-colaborador",
    icon: UserPlus,
    label: "Criar colaborador",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/catalogos",
    icon: Boxes,
    label: "Catalogos",
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    href: "/admin/ofertas",
    icon: BadgePercent,
    label: "Ofertas",
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    href: "/admin/temas",
    icon: Palette,
    label: "Temas",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/cupons",
    icon: TicketPercent,
    label: "Cupons",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/admin/cashback",
    icon: WalletCards,
    label: "Cash Back",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/club-wimifarma",
    icon: Crown,
    label: "Club Wimifarma",
    roles: ["ADMIN"],
  },
];

export async function AdminShell({
  children,
  title,
}: Readonly<{ children: React.ReactNode; title: string }>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const visibleNav = adminNav.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-surface-subtle">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-white p-4 lg:block">
        <Link className="flex items-center gap-3 px-2 py-3" href="/admin/dashboard">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-lg font-black text-white">
            W
          </span>
          <span>
            <span className="block font-black text-ink">Wimifarma</span>
            <span className="block text-xs font-semibold text-muted">
              {role === "ADMIN" ? "Administrador total" : "Colaborador"}
            </span>
          </span>
        </Link>

        <nav className="mt-6 grid gap-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-brand-soft hover:text-brand"
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-4 rounded-lg border border-line bg-surface-subtle p-4">
          <ChartNoAxesCombined className="h-5 w-5 text-brand" />
          <p className="mt-3 text-sm font-bold text-ink">Permissoes por perfil</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            ADM controla tudo. Colaborador opera catalogos, ofertas e pedidos.
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-line bg-white/92 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Painel reservado · {role}
              </p>
              <h1 className="text-lg font-black text-ink">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="secondary">
                <a href="/api/health" rel="noreferrer" target="_blank">
                  Health
                </a>
              </Button>
              <Button asChild size="sm" variant="success">
                <a
                  href="https://wa.me/5544999999999"
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <Button aria-label="Sair" size="icon" type="submit" variant="ghost">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
