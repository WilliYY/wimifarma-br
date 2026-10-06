import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { readShippingIntegration, saveShippingSettings } from "@/features/shipping/integration";
import { shippingSettingsSchema, ShippingError } from "@/features/shipping/schema";
import { noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
import { getPrisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const { settings, credentials, revision } = await readShippingIntegration();
    const products = await getPrisma().product.findMany({ where: { deletedAt: null }, select: { id: true, name: true, category: true, shippingProfile: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true, updatedAt: true }, orderBy: { name: "asc" }, take: 500 });
    return NextResponse.json({ data: { settings, revision, applicationConfigured: Boolean(credentials), connected: Boolean(credentials?.accessToken), expiresAt: credentials?.expiresAt ?? null, products } }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
export async function PUT(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const parsed = z.object({ settings: shippingSettingsSchema, revision: z.number().int().min(0), application: z.object({ clientId: z.string().regex(/^\d+$/).max(30), clientSecret: z.string().min(10).max(1000) }).optional() }).safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Confira os dados da integração, CEP e e-mail de contato.");
    await saveShippingSettings(parsed.data.settings, parsed.data.revision, guard.session!.user.id, parsed.data.application);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
