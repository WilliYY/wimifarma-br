import { z } from "zod";
import { lookupPostalCode, PostalCodeError } from "@/features/orders/postal-code";
import { ShippingError, type ShippingSettings } from "./schema";

export const MELHOR_ENVIO_SCOPES = ["shipping-calculate", "shipping-companies", "shipping-tracking"];
const quoteDestinationSchema = z.object({ to: z.object({ postal_code: z.string().regex(/^\d{8}$/) }) });

export function melhorEnvioBase(environment: ShippingSettings["environment"]) {
  return environment === "sandbox" ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
}
export const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().positive().max(90 * 86400) });

export async function melhorEnvioRequest(settings: ShippingSettings, path: string, accessToken?: string, body?: unknown, options?: { timeoutMs?: number }) {
  // The host and paths are application-owned; never accept a URL from the browser.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 12_000);
  try {
    const response = await fetch(`${melhorEnvioBase(settings.environment)}${path}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store", redirect: "error", signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": `Wimifarma (${settings.contactEmail})`, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const operation = path === "/api/v2/me/shipment/calculate" ? "calculate"
        : path === "/api/v2/me/shipment/services" ? "services" : "integration";
      console.warn("[melhor-envio] request-failed", { operation, status: response.status });
      if (response.status === 401 || response.status === 403) throw new ShippingError("Reconecte o Melhor Envio no painel administrativo para renovar as permissões.", 503);
      if (response.status === 429) throw new ShippingError("O serviço de frete está ocupado. Aguarde um momento e tente novamente.", 503);
      if (operation === "calculate" && response.status === 422 && options?.timeoutMs === undefined) {
        const destination = quoteDestinationSchema.safeParse(body);
        if (destination.success) {
          // The integrator also uses 422 for shipment data. Advisory quotes keep their own deadline.
          try {
            await lookupPostalCode(destination.data.to.postal_code);
          } catch (error) {
            if (error instanceof PostalCodeError && error.status === 404) {
              throw new ShippingError("CEP não encontrado. Confira os números e tente novamente.", 422);
            }
          }
        }
      }
      throw new ShippingError("O Melhor Envio não confirmou a cotação agora. Tente novamente ou consulte a farmácia.", 502);
    }
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof ShippingError) throw error;
    throw new ShippingError("Não foi possível consultar o Melhor Envio agora. Tente novamente em instantes.", 503);
  } finally { clearTimeout(timer); }
}
