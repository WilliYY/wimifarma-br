import { NextResponse } from "next/server";
import { readPaymentIntegration } from "@/features/payments/integration";
import { webhookSignatureFailure } from "@/features/payments/rules";
import { applyProviderOrder } from "@/features/payments/service";
import { mercadoPagoRequest } from "@/features/payments/provider";
import { providerOrderSchema } from "@/features/payments/schema";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const integration = await readPaymentIntegration();
    const failure = integration ? webhookSignatureFailure(request, integration.secrets.webhookSecret) : "unconfigured";
    if (failure) {
      // Fixed reason codes only: never log URLs, headers, signatures, bodies or secrets.
      console.warn("PAYMENT_WEBHOOK_REJECTED", failure);
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401, headers });
    }
    if (!integration) return NextResponse.json({ error: "Conexão indisponível." }, { status: 503, headers });
    const id = new URL(request.url).searchParams.get("data.id")!;
    // The notification is only a signal. Financial state comes from the authenticated provider API.
    const remote = providerOrderSchema.parse(await mercadoPagoRequest(`/v1/orders/${id.toUpperCase()}`, integration.secrets.accessToken));
    await applyProviderOrder(remote);
    return NextResponse.json({ received: true }, { headers });
  } catch { return NextResponse.json({ error: "A confirmação será tentada novamente." }, { status: 503, headers }); }
}
