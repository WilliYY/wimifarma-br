import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { directoryQuerySchema, getDirectory } from "@/features/admin-users/directory";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  const parsed = directoryQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Filtros invalidos." }, { status: 422 });
  try {
    const data = await getPrisma().$transaction(tx => getDirectory(tx, parsed.data), { isolationLevel: "RepeatableRead" });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel carregar os usuarios. Tente novamente." }, { status: 503 });
  }
}
