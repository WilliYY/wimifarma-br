import { PaymentError } from "./schema";

export async function mercadoPagoRequest(path: string, accessToken: string, body?: unknown, key?: string) {
  if (!/^\/(users\/me|v1\/orders(?:\/ORD[A-Z0-9]+)?)$/i.test(path)) throw new PaymentError("Operação de pagamento inválida.", 400);
  try {
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      method: body === undefined ? "GET" : "POST", redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(key ? { "X-Idempotency-Key": key } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new PaymentError(response.status === 401 || response.status === 403
      ? "A conexão com o Mercado Pago precisa ser conferida pela equipe."
      : "Não foi possível confirmar o pagamento. Consulte o status antes de tentar novamente.", 503);
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    throw new PaymentError("A confirmação do Mercado Pago está demorando. Consulte o status; não refaça a compra agora.", 503);
  }
}
