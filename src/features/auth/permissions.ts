import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";

type AdminApiRole = "ADMIN" | "MANAGER" | "STAFF";

export async function requireApiRole(roles: AdminApiRole[]) {
  const session = await auth();
  const role = session?.user?.role;

  if (!role || !roles.includes(role as AdminApiRole)) {
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
