export type PaymentView = { orderId: string; number: string; amountCents: number; status: string; statusDetail: string | null; pixCode: string | null; pixExpiresAt: string | null; payerEmail: string; qrDataUrl: string | null; environment: string; publicKey: string };

const consultationError = "Não foi possível consultar o pagamento. Tente consultar novamente.";

export async function readPaymentView(orderId: string, fetcher: (input: string, init?: RequestInit) => Promise<Response> = fetch): Promise<PaymentView> {
  let response: Response;
  try { response = await fetcher(`/api/pagamentos/${orderId}`, { method: "GET", cache: "no-store" }); }
  catch { throw new Error(consultationError); }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(consultationError); }
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : consultationError);
  if (payload?.data?.orderId !== orderId) throw new Error(consultationError);
  return payload.data as PaymentView;
}
