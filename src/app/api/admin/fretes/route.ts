import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { readShippingIntegration, saveShippingSettings } from "@/features/shipping/integration";
import { shippingSettingsSchema, ShippingError } from "@/features/shipping/schema";
import { noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
import { getPrisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const params = new URL(request.url).searchParams;
    const parsed = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), q: z.string().trim().max(120).default("") }).safeParse({ page: params.get("page") ?? undefined, q: params.get("q") ?? undefined });
    if (!parsed.success) throw new ShippingError("Confira a busca e a página de produtos.");
    const { q } = parsed.data;
    const where: Prisma.ProductWhereInput = { deletedAt: null, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { ean: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}) };
    const { settings, credentials, revision } = await readShippingIntegration();
    const prisma = getPrisma();
    const pageSize = 100;
    const total = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(parsed.data.page, totalPages);
    const products = await prisma.product.findMany({ where, select: { id: true, name: true, category: true, shippingProfile: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true, updatedAt: true }, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize });
    return NextResponse.json({ data: { settings, revision, applicationConfigured: Boolean(credentials), connected: Boolean(credentials?.accessToken), expiresAt: credentials?.expiresAt ?? null, products, pagination: { page, pageSize, total, totalPages } } }, { headers: noStore });
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
