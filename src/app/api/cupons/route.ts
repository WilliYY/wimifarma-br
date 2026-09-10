import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { couponApiError, requireCouponJson } from "@/features/coupons/api";
import { couponCreateSchema } from "@/features/coupons/schema";
import { couponSelect, createCoupon, serializeCoupon } from "@/features/coupons/service";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor && !/^[a-z0-9]{1,40}$/i.test(cursor)) return NextResponse.json({ error: "Pagina invalida." }, { status: 422 });
  try {
    const coupons = await getPrisma().coupon.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: couponSelect, take: 101,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = coupons.slice(0, 100);
    return NextResponse.json({ data: page.map(serializeCoupon), nextCursor: coupons.length > 100 ? page.at(-1)?.id : null });
  } catch (error) { return couponApiError(error); }
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  const contentError = requireCouponJson(request);
  if (contentError) return contentError;
  const parsed = couponCreateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  try {
    return NextResponse.json({ data: await createCoupon(getPrisma(), parsed.data, guard.session?.user.id) }, { status: 201 });
  } catch (error) { return couponApiError(error); }
}
