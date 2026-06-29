import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { couponCreateSchema } from "@/features/coupons/schema";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const couponSelect = {
  code: true,
  createdAt: true,
  description: true,
  endsAt: true,
  id: true,
  isActive: true,
  maxUses: true,
  minOrderValue: true,
  startsAt: true,
  type: true,
  updatedAt: true,
  usesCount: true,
  value: true,
} as const;

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00.000-03:00`);
}

function todaySaoPauloDateInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function buildEndsAt(startsAt: Date, durationDays: number) {
  return new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000 - 1);
}

function serializeCoupon(coupon: Awaited<ReturnType<typeof getCoupons>>[number]) {
  return {
    ...coupon,
    createdAt: coupon.createdAt.toISOString(),
    endsAt: coupon.endsAt?.toISOString() ?? null,
    minOrderValue: coupon.minOrderValue?.toString() ?? null,
    startsAt: coupon.startsAt?.toISOString() ?? null,
    updatedAt: coupon.updatedAt.toISOString(),
    value: coupon.value.toString(),
  };
}

async function getCoupons() {
  const prisma = getPrisma();

  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    select: couponSelect,
    take: 100,
  });
}

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const coupons = await getCoupons();

  return NextResponse.json({ data: coupons.map(serializeCoupon) });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const body = await readJsonBody(request);
  const parsed = couponCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const { durationDays, startsAt, ...data } = parsed.data;
  const startsAtDate = parseLocalDate(startsAt ?? todaySaoPauloDateInput());
  const endsAt = buildEndsAt(startsAtDate, durationDays);

  try {
    const coupon = await prisma.coupon.create({
      data: {
        ...data,
        endsAt,
        startsAt: startsAtDate,
      },
      select: couponSelect,
    });

    await prisma.auditLog.create({
      data: {
        action: "COUPON_CREATED",
        entity: "Coupon",
        entityId: coupon.id,
        metadata: {
          code: coupon.code,
          durationDays,
          endsAt: coupon.endsAt?.toISOString() ?? null,
          maxUses: coupon.maxUses,
          usesCount: coupon.usesCount,
        },
        userId: persistedUserId(guard.session?.user.id),
      },
    });

    return NextResponse.json({ data: serializeCoupon(coupon) }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Ja existe um cupom com esse nome/codigo." },
        { status: 409 },
      );
    }

    throw error;
  }
}
