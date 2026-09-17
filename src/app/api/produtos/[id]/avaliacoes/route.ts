import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { productReviewInputSchema } from "@/features/products/product-detail";
import { saveRewardedReview } from "@/features/cashback/review-service";
import { CashbackRuleError } from "@/features/cashback/wallet";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const headers = { "Cache-Control": "private, no-store" };
  const customerId = sessionCustomerId(session);
  if (!customerId) return NextResponse.json({ message: "Entre na sua conta de cliente para avaliar." }, { status: 401, headers });
  const parsed = productReviewInputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ message: "Escolha uma nota de 1 a 5 e escreva de 10 a 600 caracteres." }, { status: 422, headers });
  const { id } = await params;
  try {
    const result = await getPrisma().$transaction((tx) => saveRewardedReview(tx, customerId, id, parsed.data));
    return NextResponse.json({ data: { id: result.review.id, rating: result.review.rating, awardedCents: result.awardedCents }, message: "Avaliacao salva." }, { status: 201, headers });
  } catch (error) {
    if (error instanceof CashbackRuleError) return NextResponse.json({ message: error.message }, { status: error.status, headers });
    console.error("REVIEW_SAVE_FAILED", error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN");
    return NextResponse.json({ message: "Nao foi possivel confirmar a avaliacao. Atualize a pagina antes de tentar novamente." }, { status: 503, headers });
  }
}
