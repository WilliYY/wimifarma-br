import { isNotifyOnlyPendingLogistics, preserveNotifyOnlyPendingLogistics } from "@/features/products/notify-only";
import { validateShippingPublication } from "@/features/products/shipping-publication-policy";
import { ProductMutationError } from "@/features/products/mutations";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { ShippingError } from "@/features/shipping/schema";
import { shippingAdminProfileSchema } from "@/features/shipping/product-draft";
import { validateShippingProduct } from "@/features/shipping/rules";
import { noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
import { getPrisma } from "@/lib/prisma";
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const body = await shippingBody(request);
    const parsed = z.object({ profile: shippingAdminProfileSchema, updatedAt: z.iso.datetime(), releaseNotifyOnly: z.boolean().default(false) }).safeParse(body);
    if (!parsed.success) throw new ShippingError("Confira o peso, as medidas e a revisão de transporte.");
    const { id } = await context.params;
    await getPrisma().$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id, deletedAt: null } });
      if (!product) throw new ShippingError("Produto não encontrado.", 404);
      const held = isNotifyOnlyPendingLogistics(product.shippingProfile);
      const { notifyOnlyPendingLogistics: _hold, ...releasedProfile } = parsed.data.profile;
      void _hold;
      let profile = parsed.data.profile;
      if (parsed.data.releaseNotifyOnly) {
        if (!held) throw new ShippingError("Este produto não possui bloqueio Avise-me para liberar.");
        const rawProfile = (body as { profile?: unknown }).profile;
        try {
          validateShippingPublication(null, { ...product, status: "ACTIVE", shippingProfile: rawProfile && typeof rawProfile === "object" ? { ...rawProfile, notifyOnlyPendingLogistics: false } : rawProfile });
        } catch (error) {
          if (error instanceof ProductMutationError) throw new ShippingError(error.message);
          throw error;
        }
        validateShippingProduct({ ...product, shippingProfile: releasedProfile });
        profile = releasedProfile;
      } else {
        if (profile.enabled) validateShippingProduct({ ...product, shippingProfile: releasedProfile });
        profile = preserveNotifyOnlyPendingLogistics(product.shippingProfile, profile) as typeof profile;
      }
      const result = await tx.product.updateMany({ where: { id, deletedAt: null, updatedAt: new Date(parsed.data.updatedAt) }, data: { shippingProfile: profile } });
      if (result.count !== 1) throw new ShippingError("O produto mudou. Atualize a página.", 409);
      await tx.auditLog.create({ data: { userId: guard.session!.user.id, action: "PRODUCT_SHIPPING_UPDATED", entity: "Product", entityId: id, metadata: parsed.data.releaseNotifyOnly ? { before: product.shippingProfile, after: profile, releaseNotifyOnly: true } : profile } });
    });
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
