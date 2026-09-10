import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { couponApiError, requireCouponJson } from "@/features/coupons/api";
import { couponRevisionSchema, couponUpdateSchema } from "@/features/coupons/schema";
import { deleteCoupon, updateCoupon } from "@/features/coupons/service";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  const contentError = requireCouponJson(request);
  if (contentError) return contentError;
  const parsed = couponUpdateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  try {
    const { id } = await params;
    return NextResponse.json({ data: await updateCoupon(getPrisma(), id, parsed.data, guard.session?.user.id) });
  } catch (error) { return couponApiError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  const contentError = requireCouponJson(request);
  if (contentError) return contentError;
  const parsed = couponRevisionSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  try {
    const { id } = await params;
    await deleteCoupon(getPrisma(), id, parsed.data.expectedUpdatedAt, guard.session?.user.id);
    return NextResponse.json({ success: true });
  } catch (error) { return couponApiError(error); }
}
