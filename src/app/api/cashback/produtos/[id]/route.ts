import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { cashbackProductUpdateSchema } from "@/features/cashback/rules";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  const parsed = cashbackProductUpdateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Informe um percentual entre 0,01% e 100%." }, { status: 422 });
  const { id } = await params;
  const { expectedUpdatedAt, ...data } = parsed.data;
  const prisma = getPrisma();
  const saved = await prisma.$transaction(async (tx) => {
    const changed = await tx.product.updateMany({
      where: { id, updatedAt: new Date(expectedUpdatedAt),
        ...(data.cashbackEnabled ? { isPopularPharmacy: false, requiresPrescription: false } : {}) },
      data,
    });
    if (changed.count !== 1) return null;
    await tx.auditLog.create({ data: {
      action: "PRODUCT_CASHBACK_UPDATED", entity: "Product", entityId: id,
      metadata: data, userId: guard.session!.user.id,
    } });
    return tx.product.findUniqueOrThrow({ where: { id }, select: { id: true, cashbackEnabled: true, cashbackRateBps: true, updatedAt: true } });
  });
  if (!saved) return NextResponse.json({ error: "Produto alterado ou inelegivel. Atualize a lista e tente novamente." }, { status: 409 });
  return NextResponse.json({ data: saved }, { headers: { "Cache-Control": "no-store" } });
}
