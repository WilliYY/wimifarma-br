import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { couponCreateSchema } from "@/features/coupons/schema";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: coupons });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const body = await request.json();
  const parsed = couponCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const coupon = await prisma.coupon.create({ data: parsed.data });

  return NextResponse.json({ data: coupon }, { status: 201 });
}
