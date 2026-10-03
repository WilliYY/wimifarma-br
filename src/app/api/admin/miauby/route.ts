import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { limitPaymentRequest, paymentJson, paymentHeaders, paymentFailure } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";
import { commerceSettingsSchema } from "@/features/miauby/commerce-rules";
import { commerceConnection } from "@/features/miauby/commerce-provider";
import { miaubyDashboard, processCommerceEvents, queueCommerceTest } from "@/features/miauby/commerce-service";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try { return NextResponse.json({ data: await miaubyDashboard() }, { headers: paymentHeaders }); }
  catch { return NextResponse.json({ error: "Não foi possível consultar a Miauby." }, { status: 503, headers: paymentHeaders }); }
}
export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    limitPaymentRequest(request, "miauby-admin", 5);
    const input = await paymentJson(request);
    if (input && typeof input === "object" && "action" in input && input.action === "test" && Object.keys(input).length === 1) {
      if (!commerceConnection()) throw new PaymentError("Configure a conexão Miauby no servidor antes de enviar o teste.", 503);
      await queueCommerceTest(); await processCommerceEvents();
    } else {
      const parsed = commerceSettingsSchema.safeParse(input);
      if (!parsed.success) throw new PaymentError("Revise as opções da Miauby.", 422);
      const { enabled, cartAlerts, orderAlerts, paymentAlerts } = parsed.data;
      const settings = { enabled, cartAlerts, orderAlerts, paymentAlerts };
      if (settings.enabled && !commerceConnection()) throw new PaymentError("Configure a conexão Miauby no servidor antes de ativar os alertas.", 503);
      await getPrisma().$transaction(async tx => {
        await tx.miaubyConfig.upsert({ where: { id: "commerce" }, create: { id: "commerce", ...settings }, update: settings });
        const canceled = [!settings.cartAlerts && "cart", !settings.orderAlerts && "order", !settings.paymentAlerts && "payment"].filter(Boolean) as string[];
        await tx.miaubyEvent.updateMany({ where: { status: "PENDING", ...(settings.enabled ? { type: { in: canceled } } : { type: { not: "test" } }) }, data: { status: "FAILED", lastError: "Aviso cancelado nas configurações." } });
        await tx.auditLog.create({ data: { action: "MIAUBY_SETTINGS_UPDATED", entity: "MiaubyConfig", entityId: "commerce", userId: guard.session?.user?.id, metadata: settings } });
      });
    }
    return NextResponse.json({ data: await miaubyDashboard() }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
