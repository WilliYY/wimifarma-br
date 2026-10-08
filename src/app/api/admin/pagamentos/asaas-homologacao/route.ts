import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { asaasTestCreation, createAsaasSandboxPayment, getAsaasHomologationState, refreshAsaasSandboxPayment } from "@/features/payments/asaas-service";
import { prepareAsaasSandboxIntegration } from "@/features/payments/asaas-sandbox-integration";
import { limitPaymentRequest, paymentFailure, paymentHeaders, paymentJson } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), credentialId: z.string().min(1).max(128), email: z.email().max(160), revision: z.number().int().nonnegative() }).strict(),
  asaasTestCreation.extend({ action: z.literal("create") }).strict(),
  z.object({ action: z.literal("refresh"), orderId: z.string().min(1).max(128) }).strict(),
]);

export async function GET() {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  try { return NextResponse.json({ data: await getAsaasHomologationState() }, { headers: paymentHeaders }); }
  catch (error) { return paymentFailure(error); }
}

export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  try {
    limitPaymentRequest(request, "asaas-homologation", 10);
    const parsed = input.safeParse(await paymentJson(request, 2048));
    if (!parsed.success) throw new PaymentError("Confira os dados do ensaio Sandbox.", 422);
    const data = parsed.data;
    if (data.action === "prepare") await prepareAsaasSandboxIntegration({ credentialId: data.credentialId, email: data.email, revision: data.revision }, guard.session!.user.id);
    else if (data.action === "create") await createAsaasSandboxPayment({ productId: data.productId, method: data.method, requestId: data.requestId }, guard.session!.user.id);
    else await refreshAsaasSandboxPayment(data.orderId);
    return NextResponse.json({ data: await getAsaasHomologationState() }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
