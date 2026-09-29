import { z } from "zod";
import { ShippingError, type ShippingSettings } from "./schema";

export const MELHOR_ENVIO_SCOPES = ["shipping-calculate", "shipping-companies", "shipping-tracking"];
export function melhorEnvioBase(environment: ShippingSettings["environment"]) {
  return environment === "sandbox" ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
}
export const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().positive().max(90 * 86400) });

export async function melhorEnvioRequest(settings: ShippingSettings, path: string, accessToken?: string, body?: unknown) {
  // The host and paths are application-owned; never accept a URL from the browser.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${melhorEnvioBase(settings.environment)}${path}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store", redirect: "error", signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": `Wimifarma (${settings.contactEmail})`, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new ShippingError("Reconecte o Melhor Envio no painel administrativo para renovar as permissões.", 503);
      if (response.status === 429) throw new ShippingError("O serviço de frete está ocupado. Aguarde um momento e tente novamente.", 503);
      throw new ShippingError("O Melhor Envio não conseguiu atender a consulta. Confira os dados e tente novamente.", 502);
    }
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof ShippingError) throw error;
    throw new ShippingError("Não foi possível consultar o Melhor Envio agora. Tente novamente em instantes.", 503);
  } finally { clearTimeout(timer); }
}
