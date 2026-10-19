import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { adminQuerySchema, notificationSchema, RestockError } from "@/features/restock/contracts";
import { assertRestockOrigin, restockBody, restockFailure, restockHeaders } from "@/features/restock/http";
import { getAdminRestock, markRestockNotified, prepareRestockDraft } from "@/features/restock/service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
async function adminActor() {
  const access = await requireAdminApi();
  if (access.response || !access.session?.user?.id) throw new RestockError("Não autorizado.", 401);
  const actor = await getPrisma().user.findUnique({ where: { id: access.session.user.id }, select: { id: true, role: true, isActive: true } });
  if (!actor?.isActive || !["ADMIN", "MANAGER"].includes(actor.role)) throw new RestockError("Não autorizado.", 401);
  return actor.id;
}
export async function GET(request: Request) {
  try {
    assertRestockOrigin(request);
    await adminActor();
    const query = adminQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) throw new RestockError("Consulta inválida.", 400);
    const result = await getPrisma().$transaction(tx => getAdminRestock(tx, query.data.page, query.data.filter), { isolationLevel: "RepeatableRead", timeout: 15_000 });
    return NextResponse.json(result, { headers: restockHeaders });
  } catch (error) { return restockFailure(error, "admin_get"); }
}
export async function PATCH(request: Request) {
  try {
    assertRestockOrigin(request);
    const actorId = await adminActor();
    const input = await restockBody(request, notificationSchema);
    const result = await getPrisma().$transaction(tx => markRestockNotified(tx, actorId, input));
    return NextResponse.json(result, { headers: restockHeaders });
  } catch (error) { return restockFailure(error, "admin_patch"); }
}
export async function POST(request: Request) {
  try {
    assertRestockOrigin(request);
    await adminActor();
    const input = await restockBody(request, notificationSchema);
    const result = await getPrisma().$transaction(tx => prepareRestockDraft(tx, input));
    return NextResponse.json(result, { headers: restockHeaders });
  } catch (error) { return restockFailure(error, "admin_post"); }
}
