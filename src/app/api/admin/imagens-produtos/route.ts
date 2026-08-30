import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { isBackgroundRemovalAvailable } from "@/features/product-images/service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const images = await getPrisma().productImage.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      _count: { select: { products: true } },
      backgroundRemoved: true,
      createdAt: true,
      height: true,
      id: true,
      originalName: true,
      sizeBytes: true,
      url: true,
      width: true,
    },
    take: 100,
  });

  return NextResponse.json({
    data: images.map(({ _count, createdAt, ...image }) => ({
      ...image,
      createdAt: createdAt.toISOString(),
      usageCount: _count.products,
    })),
    meta: { backgroundRemovalAvailable: isBackgroundRemovalAvailable() },
  });
}
