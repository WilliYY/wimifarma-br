import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";

export async function requireAdminApi() {
  const session = await auth();
  const role = session?.user?.role;

  if (role !== "ADMIN" && role !== "MANAGER") {
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
