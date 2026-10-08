import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { asaasSandboxInput, checkAsaasSandbox, listAsaasSandboxCredentials } from "@/features/payments/asaas-sandbox";
import { limitPaymentRequest, paymentFailure, paymentHeaders, paymentJson } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  try { return NextResponse.json({ data: await listAsaasSandboxCredentials() }, { headers: paymentHeaders }); }
  catch (error) { return paymentFailure(error); }
}

export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  try {
    limitPaymentRequest(request, "asaas-sandbox-check", 5);
    const parsed = asaasSandboxInput.safeParse(await paymentJson(request, 2048));
    if (!parsed.success) throw new PaymentError("Selecione uma credencial Sandbox do cofre.", 422);
    const data = await checkAsaasSandbox(parsed.data.credentialId, guard.session!.user.id);
    return NextResponse.json({ data }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
