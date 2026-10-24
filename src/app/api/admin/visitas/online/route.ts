import { NextResponse } from "next/server";
import { getOnlineVisitorSummary } from "@/features/analytics/online-presence";
import { adminRoutePermissions, requireApiRole } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const guard = await requireApiRole(adminRoutePermissions["/admin/dashboard"]);
  if (guard.response) {
    guard.response.headers.set("Cache-Control", headers["Cache-Control"]);
    return guard.response;
  }
  try {
    return NextResponse.json({ data: await getOnlineVisitorSummary(getPrisma()) }, { headers });
  } catch {
    return NextResponse.json({ error: "Contagem de visitantes indisponível." }, { status: 503, headers });
  }
}
