import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { CashbackRuleError } from "@/features/cashback/wallet";
import { checkoutRequestSchema } from "@/features/orders/checkout";
import { createCheckout } from "@/features/orders/create-checkout";
import { getPrisma } from "@/lib/prisma";
import { ShippingError } from "@/features/shipping/schema";
import { PaymentError } from "@/features/payments/schema";
import { paymentAccessToken } from "@/features/payments/rules";
import { paymentCookieName } from "@/features/payments/service";
import { limitPaymentRequest, paymentJson } from "@/features/payments/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  let body: unknown;
  try { limitPaymentRequest(request, "checkout", 10); body = await paymentJson(request); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Solicitação inválida." }, { status: error instanceof PaymentError ? error.status : 400, headers }); }
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do checkout.", fields: parsed.error.flatten() }, { status: 422, headers });
  const session = await auth();
  const customerId = sessionCustomerId(session);
  try {
    const order = await getPrisma().$transaction((tx) => createCheckout(tx, parsed.data, customerId, session?.user?.role === "ADMIN"));
    const response = NextResponse.json({ data: { ...order, createdAt: order.createdAt.toISOString() }, message: "Pedido recebido." }, { status: 201, headers });
    if (order.paymentMethod === "ONLINE" && parsed.data.checkoutRequestId) response.cookies.set(paymentCookieName(order.id), paymentAccessToken(order.id, parsed.data.checkoutRequestId), { httpOnly: true, secure: new URL(process.env.AUTH_URL || request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 86400 });
    return response;
  } catch (error) {
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof ShippingError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof CashbackRuleError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers });
    console.error("CHECKOUT_SAVE_FAILED", error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN");
    return NextResponse.json({ error: "Nao foi possivel confirmar o envio. Consulte a equipe antes de tentar novamente." }, { status: 503, headers });
  }
}
