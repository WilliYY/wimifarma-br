import { NextRequest, NextResponse } from "next/server";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { readShippingIntegration, SHIPPING_INTEGRATION_ID } from "@/features/shipping/integration";
import { readShippingState, shippingCallbackUrl, SHIPPING_STATE_COOKIE } from "@/features/shipping/oauth";
import { melhorEnvioRequest, tokenSchema } from "@/features/shipping/provider";
import { encryptValue } from "@/lib/secret-vault";
import { getPrisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  let success = false;
  try {
    const integration = await readShippingIntegration();
    const { credentials, revision, settings } = integration;
    const code = request.nextUrl.searchParams.get("code");
    if (!credentials || !code || code.length > 4000 || request.nextUrl.searchParams.has("error")) throw new Error();
    readShippingState(request.cookies.get(SHIPPING_STATE_COOKIE)?.value ?? "", request.nextUrl.searchParams.get("state") ?? "", guard.session!.user.id, revision);
    const tokens = tokenSchema.parse(await melhorEnvioRequest(settings, "/oauth/token", undefined, { grant_type: "authorization_code", client_id: credentials.clientId, client_secret: credentials.clientSecret, redirect_uri: shippingCallbackUrl(), code }));
    const encrypted = encryptValue(JSON.stringify({ ...credentials, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000 }));
    await getPrisma().$transaction(async (tx) => {
      const saved = await tx.shippingIntegration.updateMany({ where: { id: SHIPPING_INTEGRATION_ID, revision }, data: { ...encrypted, revision: { increment: 1 } } });
      if (saved.count !== 1) throw new Error();
      await tx.auditLog.create({ data: { userId: guard.session!.user.id, action: "SHIPPING_CONNECTED", entity: "ShippingIntegration", entityId: SHIPPING_INTEGRATION_ID, metadata: { environment: settings.environment } } });
    });
    success = true;
  } catch { /* Never expose authorization codes, tokens or upstream errors in URLs/logs. */ }
  const response = NextResponse.redirect(new URL(`/admin/fretes?connection=${success ? "success" : "failed"}`, shippingCallbackUrl()));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(SHIPPING_STATE_COOKIE, "", { path: "/api/admin/fretes/conectar", maxAge: 0 });
  return response;
}
