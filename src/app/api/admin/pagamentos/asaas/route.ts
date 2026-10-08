import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { activateAsaasIntegration, asaasIntegrationView, prepareAsaasIntegration } from "@/features/payments/asaas-integration";
import { limitPaymentRequest, paymentFailure, paymentHeaders, paymentJson } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), revision: z.number().int().nonnegative(), email: z.email().max(160) }).strict(),
  z.object({ action: z.literal("activate"), revision: z.number().int().nonnegative(), enabled: z.boolean(), methods: z.array(z.enum(["pix", "card"])).max(2) }).strict(),
]);
export async function GET() {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try { return NextResponse.json({ data: await asaasIntegrationView() }, { headers: paymentHeaders }); } catch (error) { return paymentFailure(error); }
}
export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    limitPaymentRequest(request, "asaas-production", 5);
    const parsed = input.safeParse(await paymentJson(request, 2048));
    if (!parsed.success) throw new PaymentError("Revise a configuração Asaas.", 422);
    if (parsed.data.action === "prepare") await prepareAsaasIntegration(parsed.data, guard.session!.user.id);
    else await activateAsaasIntegration(parsed.data, guard.session!.user.id);
    return NextResponse.json({ data: await asaasIntegrationView() }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
