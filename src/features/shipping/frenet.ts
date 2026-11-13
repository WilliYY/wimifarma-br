import { z } from "zod";
import { ShippingError } from "./schema";

const FRENET_QUOTE_URL = "https://api.frenet.com.br/shipping/quote";
const postalCode = z.string().regex(/^(?!0{8}$)[0-9]{8}$/);
const dimension = z.number().positive().max(200);
const credential = z.string().trim().min(1).max(1024).regex(/^[!-~]+$/);
const quoteInputSchema = z.object({
  originPostalCode: postalCode,
  destinationPostalCode: postalCode,
  invoiceValueCents: z.number().int().min(0).max(100_000_000),
  items: z.array(z.object({
    weightGrams: z.number().int().min(1).max(30_000),
    lengthCm: dimension,
    heightCm: dimension,
    widthCm: dimension,
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(30),
});
const quoteEnvelopeSchema = z.object({ ShippingSevicesArray: z.array(z.unknown()).max(100) });
const unavailableQuoteRowSchema = z.object({ Error: z.literal(true) });
const quoteRowSchema = z.object({
  ServiceCode: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/),
  ServiceDescription: z.string().trim().min(1).max(160),
  Carrier: z.string().trim().min(1).max(120),
  ShippingPrice: z.union([z.string(), z.number()]),
  DeliveryTime: z.union([z.string(), z.number()]),
  Error: z.literal(false),
  AllowBuyLabel: z.boolean().default(false),
});

type FrenetQuoteInput = z.input<typeof quoteInputSchema> & { token: string; partnerToken?: string };
export type FrenetQuote = {
  serviceId: string;
  carrier: string;
  service: string;
  priceCents: number;
  deliveryDays: number;
  allowBuyLabel: boolean;
};

function parseQuotes(body: unknown): FrenetQuote[] {
  const envelope = quoteEnvelopeSchema.safeParse(body);
  if (!envelope.success) throw new ShippingError("A Frenet retornou uma cotação inválida.", 502);
  const quotes = new Map<string, FrenetQuote>();
  const ambiguousServices = new Set<string>();
  const rows = envelope.data.ShippingSevicesArray;
  let unavailable = 0;

  for (const option of rows) {
    if (unavailableQuoteRowSchema.safeParse(option).success) {
      unavailable++;
      continue;
    }
    const parsed = quoteRowSchema.safeParse(option);
    if (!parsed.success) continue;
    const row = parsed.data;
    const price = String(row.ShippingPrice).trim();
    const days = String(row.DeliveryTime).trim();
    if (!/^[0-9]{1,7}(?:\.[0-9]{1,2})?$/.test(price) || !/^[0-9]{1,3}$/.test(days)) continue;
    if (quotes.has(row.ServiceCode)) ambiguousServices.add(row.ServiceCode);
    quotes.set(row.ServiceCode, {
      serviceId: row.ServiceCode,
      carrier: row.Carrier,
      service: row.ServiceDescription,
      priceCents: Math.round(Number(price) * 100),
      deliveryDays: Number(days),
      allowBuyLabel: row.AllowBuyLabel,
    });
  }

  const usableQuotes = [...quotes.values()].filter(quote => !ambiguousServices.has(quote.serviceId));
  if (!usableQuotes.length && unavailable !== rows.length) {
    throw new ShippingError("A Frenet retornou uma cotação inválida.", 502);
  }
  return usableQuotes;
}

export async function quoteFrenet(input: FrenetQuoteInput, options?: { timeoutMs?: number }): Promise<FrenetQuote[]> {
  if (typeof window !== "undefined") throw new ShippingError("A cotação Frenet é exclusiva do servidor.", 503);
  const token = credential.safeParse(input.token);
  const partnerToken = credential.optional().safeParse(input.partnerToken);
  if (!token.success || !partnerToken.success) {
    throw new ShippingError("Configure as credenciais da Frenet no servidor.", 503);
  }
  const quote = quoteInputSchema.safeParse(input);
  if (!quote.success) throw new ShippingError("Confira os CEPs e as medidas para cotar na Frenet.", 422);
  const data = quote.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 12_000);
  try {
    const response = await fetch(FRENET_QUOTE_URL, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        token: token.data,
        ...(partnerToken.data ? { "x-partner-token": partnerToken.data } : {}),
      },
      body: JSON.stringify({
        SellerCEP: data.originPostalCode,
        RecipientCEP: data.destinationPostalCode,
        RecipientCountry: "BR",
        ShipmentInvoiceValue: data.invoiceValueCents / 100,
        ShippingItemArray: data.items.map(item => ({
          Weight: item.weightGrams / 1000,
          Length: item.lengthCm,
          Height: item.heightCm,
          Width: item.widthCm,
          Quantity: item.quantity,
        })),
      }),
    });

    if (response.status === 401 || response.status === 403) {
      throw new ShippingError("Confira as credenciais da Frenet e as permissões da conta.", 503);
    }
    if (response.status === 429) {
      throw new ShippingError("A Frenet está ocupada. Aguarde um momento e tente novamente.", 503);
    }
    if (!response.ok) throw new ShippingError("A Frenet não conseguiu atender a consulta.", 502);

    const body: unknown = await response.json().catch(() => {
      if (controller.signal.aborted) throw new ShippingError("Não foi possível consultar a Frenet agora. Tente novamente em instantes.", 503);
      throw new ShippingError("A Frenet retornou uma cotação inválida.", 502);
    });
    return parseQuotes(body);
  } catch (error) {
    if (error instanceof ShippingError) throw error;
    throw new ShippingError("Não foi possível consultar a Frenet agora. Tente novamente em instantes.", 503);
  } finally {
    clearTimeout(timer);
  }
}
