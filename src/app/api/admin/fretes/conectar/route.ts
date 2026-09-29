import { NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { readShippingIntegration } from "@/features/shipping/integration";
import { MELHOR_ENVIO_SCOPES, melhorEnvioBase } from "@/features/shipping/provider";
import { createShippingState, shippingCallbackUrl, SHIPPING_STATE_COOKIE } from "@/features/shipping/oauth";
import { shippingBody, shippingFailure, noStore } from "@/features/shipping/http";
import { ShippingError } from "@/features/shipping/schema";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    await shippingBody(request);
    const { settings, credentials, revision } = await readShippingIntegration();
    if (!credentials) throw new ShippingError("Salve os dados do aplicativo primeiro.");
    const state = createShippingState(guard.session!.user.id, revision);
    const url = new URL("/oauth/authorize", melhorEnvioBase(settings.environment));
    url.search = new URLSearchParams({ client_id: credentials.clientId, redirect_uri: shippingCallbackUrl(), response_type: "code", state: state.nonce, scope: MELHOR_ENVIO_SCOPES.join(" ") }).toString();
    const response = NextResponse.json({ url: url.toString() }, { headers: noStore });
    response.cookies.set(SHIPPING_STATE_COOKIE, state.cookie, { httpOnly: true, secure: new URL(shippingCallbackUrl()).protocol === "https:", sameSite: "lax", path: "/api/admin/fretes/conectar", maxAge: 600 });
    return response;
  } catch (error) { return shippingFailure(error); }
}
