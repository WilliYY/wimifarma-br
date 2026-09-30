import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { paymentFailure, paymentHeaders, paymentJson } from "@/features/payments/http";
import { readPaymentIntegration, savePaymentIntegration } from "@/features/payments/integration";
import { paymentSettingsSchema, PaymentError } from "@/features/payments/schema";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const row = await readPaymentIntegration();
    return NextResponse.json({ data: row ? { revision: row.revision, enabled: row.enabled, environment: row.environment, publicKey: row.publicKey, connected: true } : { revision: 0, enabled: false, environment: "test", publicKey: "", connected: false } }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
export async function PUT(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const parsed = paymentSettingsSchema.safeParse(await paymentJson(request));
    if (!parsed.success) throw new PaymentError("Confira os campos da conexão.", 422);
    await savePaymentIntegration(parsed.data, guard.session!.user.id);
    return NextResponse.json({ message: "Configuração salva. Credenciais verificadas no Mercado Pago." }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
