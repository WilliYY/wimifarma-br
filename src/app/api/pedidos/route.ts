import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { CashbackRuleError } from "@/features/cashback/wallet";
import { checkoutRequestSchema } from "@/features/orders/checkout";
import { createCheckout } from "@/features/orders/create-checkout";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const parsed = checkoutRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do checkout.", fields: parsed.error.flatten() }, { status: 422, headers });
  const session = await auth();
  const customerId = sessionCustomerId(session);
  try {
    const order = await getPrisma().$transaction((tx) => createCheckout(tx, parsed.data, customerId));
    return NextResponse.json({ data: { ...order, createdAt: order.createdAt.toISOString() }, message: "Pedido recebido e aguardando confirmacao da farmacia." }, { status: 201, headers });
  } catch (error) {
    if (error instanceof CashbackRuleError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers });
    console.error("CHECKOUT_SAVE_FAILED", error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN");
    return NextResponse.json({ error: "Nao foi possivel confirmar o envio. Consulte a equipe antes de tentar novamente." }, { status: 503, headers });
  }
}
