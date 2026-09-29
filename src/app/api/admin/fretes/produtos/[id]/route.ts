import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { shippingProfileSchema, ShippingError } from "@/features/shipping/schema";
import { validateShippingProduct } from "@/features/shipping/rules";
import { noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
import { getPrisma } from "@/lib/prisma";
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const parsed = z.object({ profile: shippingProfileSchema, updatedAt: z.iso.datetime() }).safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Confira o peso, as medidas e a revisão de transporte.");
    const { id } = await context.params;
    await getPrisma().$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id, deletedAt: null } });
      if (!product) throw new ShippingError("Produto não encontrado.", 404);
      if (parsed.data.profile.enabled) validateShippingProduct({ ...product, shippingProfile: parsed.data.profile });
      const result = await tx.product.updateMany({ where: { id, deletedAt: null, updatedAt: new Date(parsed.data.updatedAt) }, data: { shippingProfile: parsed.data.profile } });
      if (result.count !== 1) throw new ShippingError("O produto mudou. Atualize a página.", 409);
      await tx.auditLog.create({ data: { userId: guard.session!.user.id, action: "PRODUCT_SHIPPING_UPDATED", entity: "Product", entityId: id, metadata: parsed.data.profile } });
    });
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
