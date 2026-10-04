import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { feeSettingsInput, feeSettingsView, saveFeeSettings, synchronizeFeeSettings } from "@/features/payments/fee-settings";
import { limitPaymentRequest, paymentFailure, paymentHeaders, paymentJson } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try { return NextResponse.json({ data: await feeSettingsView() }, { headers: paymentHeaders }); }
  catch (error) { return paymentFailure(error); }
}
export async function PUT(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    limitPaymentRequest(request, "fee-settings", 10);
    const parsed = feeSettingsInput.safeParse(await paymentJson(request, 128_000));
    if (!parsed.success) throw new PaymentError("Confira valores, parcelas, fonte e validade das tarifas.", 422);
    await saveFeeSettings(parsed.data, guard.session!.user.id);
    return NextResponse.json({ data: await feeSettingsView() }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    limitPaymentRequest(request, "fee-sync", 5);
    await paymentJson(request);
    await synchronizeFeeSettings(guard.session!.user.id);
    return NextResponse.json({ data: await feeSettingsView() }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
