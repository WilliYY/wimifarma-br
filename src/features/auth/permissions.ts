import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/auth";

export type AdminRole = "ADMIN" | "MANAGER" | "STAFF";

export const adminRoutePermissions = {
  "/admin/dashboard": ["ADMIN", "MANAGER", "STAFF"],
  "/admin/api-senhas": ["ADMIN"],
  "/admin/cashback": ["ADMIN"],
  "/admin/catalogos": ["ADMIN", "MANAGER", "STAFF"],
  "/admin/clientes": ["ADMIN", "MANAGER", "STAFF"],
  "/admin/club-wimifarma": ["ADMIN"],
  "/admin/configuracoes": ["ADMIN"],
  "/admin/criar-adm": ["ADMIN"],
  "/admin/criar-colaborador": ["ADMIN"],
  "/admin/cupons": ["ADMIN", "MANAGER"],
  "/admin/ofertas": ["ADMIN", "MANAGER", "STAFF"],
  "/admin/produtos": ["ADMIN", "MANAGER", "STAFF"],
  "/admin/roleta": ["ADMIN", "MANAGER"],
  "/admin/temas": ["ADMIN"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type AdminRoute = keyof typeof adminRoutePermissions;

function isAdminRole(role: unknown): role is AdminRole {
  return role === "ADMIN" || role === "MANAGER" || role === "STAFF";
}

export function canAccessAdminRole(
  role: unknown,
  roles: readonly AdminRole[],
): role is AdminRole {
  return isAdminRole(role) && roles.includes(role);
}

export async function requireAdminPageRole(roles: readonly AdminRole[]) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user || !isAdminRole(role)) {
    redirect("/login");
  }

  if (!roles.includes(role)) {
    redirect("/admin/dashboard");
  }

  return {
    role,
    session,
  };
}

export function requireAdminPageRoute(route: AdminRoute) {
  return requireAdminPageRole(adminRoutePermissions[route]);
}

export async function requireApiRole(roles: readonly AdminRole[]) {
  const session = await auth();
  const role = session?.user?.role;

  if (!canAccessAdminRole(role, roles)) {
    return {
      response: NextResponse.json(
        { error: "Nao autorizado." },
        { status: 401 },
      ),
      session: null,
    };
  }

  return {
    response: null,
    session,
  };
}

export async function requireAdminOnlyApi() {
  return requireApiRole(["ADMIN"]);
}

export async function requireAdminApi() {
  return requireApiRole(["ADMIN", "MANAGER"]);
}
