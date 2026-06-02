import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import { spinWheelCampaignCreateSchema } from "@/features/spin-wheel/schema";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  const campaigns = await prisma.spinWheelCampaign.findMany({
    include: { prizes: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({ data: campaigns });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const body = await readJsonBody(request);
  const parsed = spinWheelCampaignCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const campaign = await prisma.spinWheelCampaign.create({ data: parsed.data });

  return NextResponse.json({ data: campaign }, { status: 201 });
}
