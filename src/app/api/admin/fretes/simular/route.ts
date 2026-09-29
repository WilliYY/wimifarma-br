import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { readShippingIntegration, shippingAccessToken } from "@/features/shipping/integration";
import { melhorEnvioRequest } from "@/features/shipping/provider";
import { normalizeQuotes } from "@/features/shipping/rules";
import { ShippingError } from "@/features/shipping/schema";
import { limitShippingRequest, noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    limitShippingRequest(request);
    const parsed = z.object({ postalCode: z.string().regex(/^\d{8}$/), width: z.number().positive().max(200), height: z.number().positive().max(200), length: z.number().positive().max(200), weight: z.number().positive().max(30), insurance: z.number().positive().max(100000) }).safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Informe CEP, peso em kg, medidas em cm e valor da mercadoria.");
    const { settings } = await readShippingIntegration();
    const { postalCode, ...volume } = parsed.data;
    const raw = await melhorEnvioRequest(settings, "/api/v2/me/shipment/calculate", await shippingAccessToken(), { from: { postal_code: settings.originPostalCode }, to: { postal_code: postalCode }, volumes: [volume], options: { receipt: false, own_hand: false } });
    const ids = Array.isArray(raw) ? raw.map((item) => item?.id).filter((id): id is number => typeof id === "number") : [];
    return NextResponse.json({ data: normalizeQuotes(raw, ids, settings.preparationDays), environment: settings.environment }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
