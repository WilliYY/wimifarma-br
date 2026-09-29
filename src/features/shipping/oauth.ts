import { randomBytes } from "node:crypto";
import { z } from "zod";
import { encryptValue, decryptValue } from "@/lib/secret-vault";
import { ShippingError } from "./schema";

export const SHIPPING_STATE_COOKIE = "wimifarma-shipping-state";
const oauthStateSchema = z.object({ nonce: z.string().length(48), userId: z.string().min(1), revision: z.number().int(), expiresAt: z.number() });
export function shippingCallbackUrl() {
  const url = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new ShippingError("Configure a URL HTTPS da loja antes de conectar.", 503);
  return new URL("/api/admin/fretes/conectar/callback", url.origin).toString();
}
export function createShippingState(userId: string, revision: number) {
  const state = { userId, revision, nonce: randomBytes(24).toString("hex"), expiresAt: Date.now() + 10 * 60 * 1000 };
  return { nonce: state.nonce, cookie: Buffer.from(JSON.stringify(encryptValue(JSON.stringify(state)))).toString("base64url") };
}
export function readShippingState(cookie: string, nonce: string, userId: string, revision: number) {
  try {
    if (cookie.length > 4000) throw new Error();
    const encrypted = z.object({ ciphertext: z.string(), iv: z.string(), tag: z.string() }).parse(JSON.parse(Buffer.from(cookie, "base64url").toString()));
    const state = oauthStateSchema.parse(JSON.parse(decryptValue(encrypted)));
    if (state.nonce !== nonce || state.userId !== userId || state.revision !== revision || state.expiresAt <= Date.now()) throw new Error();
    return state;
  } catch { throw new ShippingError("A autorização expirou ou não corresponde à sua sessão. Conecte novamente.", 403); }
}
