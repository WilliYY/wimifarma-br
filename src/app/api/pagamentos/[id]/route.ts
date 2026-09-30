import { NextResponse } from "next/server";
import { authorizePayment, cancelUnsubmittedPayment, paymentView, refreshPayment, startPayment } from "@/features/payments/service";
import { limitPaymentRequest, paymentFailure, paymentHeaders, paymentJson } from "@/features/payments/http";
import { PaymentError, paymentInputSchema } from "@/features/payments/schema";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    limitPaymentRequest(request, "view"); const { id } = await context.params; await authorizePayment(id);
    return NextResponse.json({ data: await paymentView(id) }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    limitPaymentRequest(request, "payment", 10); const body = await paymentJson(request); const { id } = await context.params; await authorizePayment(id);
    if (body && typeof body === "object" && "action" in body) {
      if (body.action === "refresh") return NextResponse.json({ data: await refreshPayment(id) }, { headers: paymentHeaders });
      if (body.action === "cancel") { await cancelUnsubmittedPayment(id); return NextResponse.json({ data: await paymentView(id) }, { headers: paymentHeaders }); }
    }
    const parsed = paymentInputSchema.safeParse(body);
    if (!parsed.success) throw new PaymentError("Revise os dados do pagamento.", 422);
    return NextResponse.json({ data: await startPayment(id, parsed.data) }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
