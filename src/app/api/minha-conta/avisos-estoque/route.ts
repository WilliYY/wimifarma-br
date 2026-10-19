import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { cancelSchema, customerQuerySchema, RestockError, subscribeSchema } from "@/features/restock/contracts";
import { assertRestockOrigin, restockBody, restockFailure, restockHeaders } from "@/features/restock/http";
import { cancelRestock, getCustomerRestock, subscribeRestock } from "@/features/restock/service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    assertRestockOrigin(request);
    const query = customerQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) throw new RestockError("Consulta inválida.", 400);
    const session = await auth();
    const result = await getPrisma().$transaction(tx => getCustomerRestock(tx, session, query.data.productId));
    return NextResponse.json(result, { headers: restockHeaders });
  } catch (error) { return restockFailure(error, "customer_get"); }
}
export async function POST(request: Request) {
  try {
    assertRestockOrigin(request);
    const session = await auth();
    if (!session?.user?.id) throw new RestockError("Entre na sua conta.", 401);
    const input = await restockBody(request, subscribeSchema);
    const result = await getPrisma().$transaction(tx => subscribeRestock(tx, session, input));
    return NextResponse.json(result, { headers: restockHeaders });
  } catch (error) { return restockFailure(error, "customer_post"); }
}
export async function DELETE(request: Request) {
  try {
    assertRestockOrigin(request);
    const session = await auth();
    if (!session?.user?.id) throw new RestockError("Entre na sua conta.", 401);
    const input = await restockBody(request, cancelSchema);
    const result = await getPrisma().$transaction(tx => cancelRestock(tx, session, input.id));
    return NextResponse.json(result, { headers: restockHeaders });
  } catch (error) { return restockFailure(error, "customer_delete"); }
}
