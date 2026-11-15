import { z } from "zod";
import type { FrenetQuote } from "./frenet";
import { ShippingError } from "./schema";

const quoteUrl = "https://whitelabel.frenet.com.br/v1/quotes";
const originPostalCode = "87525000";
const correiosServices = { "03298": "PAC", "03220": "SEDEX" } as const;
const credential = z.string().trim().min(1).max(1024).regex(/^[!-~]+$/);
const dimension = z.number().positive().max(100);
const parcelSchema = z.object({
  weightGrams: z.number().int().min(1).max(30_000),
  lengthCm: dimension,
  widthCm: dimension,
  heightCm: dimension,
}).refine(({ lengthCm, widthCm, heightCm }) => lengthCm + widthCm + heightCm <= 200);
const inputSchema = z.object({
  destinationPostalCode: z.string().regex(/^(?!0{8}$)\d{8}$/),
  invoiceValueCents: z.number().int().positive().max(10_000_000),
  parcel: parcelSchema,
});
type QuoteFrenetLabelInput = z.input<typeof inputSchema> & { token: string; partnerToken: string };

const sessionId = z.string().trim().min(1).max(128);
const quotations = z.array(z.record(z.string(), z.unknown())).max(100);
// The response example uses camelCase and the OpenAPI model uses PascalCase.
const resultSchema = z.union([
  z.object({ sessionId, quotations }).transform(data => ({ rows: data.quotations, pascalCase: false })),
  z.object({ SessionId: sessionId, Quotations: quotations }).transform(data => ({ rows: data.Quotations, pascalCase: true })),
]);
const rateSchema = z.object({
  price: z.number().min(0.01).max(9_999_999),
  days: z.number().int().nonnegative().max(999),
  error: z.literal(false).optional(),
});

function correiosServiceCode(value: unknown): keyof typeof correiosServices | undefined {
  switch (value) {
    case 3298: case "3298": case "03298": return "03298";
    case 3220: case "3220": case "03220": return "03220";
    default: return undefined;
  }
}

function parseLabelQuotes(body: unknown): FrenetQuote[] {
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) throw new ShippingError("A Frenet retornou uma cotação de etiqueta inválida.", 502);
  const { pascalCase, rows } = parsed.data;
  const seen = new Set<string>();
  const quotes = new Map<string, FrenetQuote>();
  let malformedRate = false;
  for (const row of rows) {
    const carrier = pascalCase ? row.CarrierCode : row.carrierCode;
    const serviceId = correiosServiceCode(pascalCase ? row.ShippingServiceCode : row.shippingServiceCode);
    if (carrier !== "COR" || !serviceId) continue;
    if (seen.has(serviceId)) {
      quotes.delete(serviceId);
      continue;
    }
    seen.add(serviceId);
    const error = pascalCase ? row.Error : row.error;
    if (error === true) continue;
    const rate = rateSchema.safeParse({
      price: pascalCase ? row.ShippingPrice : row.shippingPrice,
      days: pascalCase ? row.DeliveryTime : row.deliveryTime,
      error,
    });
    if (!rate.success) {
      malformedRate = true;
      continue;
    }
    quotes.set(serviceId, {
      serviceId, carrier: "Correios", service: correiosServices[serviceId],
      priceCents: Math.round(rate.data.price * 100), deliveryDays: rate.data.days, allowBuyLabel: false,
    });
  }
  if (!quotes.size && malformedRate) throw new ShippingError("A Frenet retornou uma cotação de etiqueta inválida.", 502);
  return [...quotes.values()];
}

export async function quoteFrenetLabel(
  input: QuoteFrenetLabelInput,
  { request = fetch, timeoutMs = 12_000 }: { request?: typeof fetch; timeoutMs?: number } = {},
): Promise<FrenetQuote[]> {
  if (typeof window !== "undefined") throw new ShippingError("A cotação Frenet é exclusiva do servidor.", 503);
  const token = credential.safeParse(input.token);
  const partnerToken = credential.safeParse(input.partnerToken);
  if (!token.success || !partnerToken.success) {
    throw new ShippingError("Configure as credenciais de cliente e parceiro da Frenet no servidor.", 503);
  }
  const quote = inputSchema.safeParse(input);
  if (!quote.success) throw new ShippingError("Confira o CEP, o valor e os limites do pacote para cotar na Frenet.", 422);
  const { destinationPostalCode, invoiceValueCents, parcel } = quote.data;
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await request(quoteUrl, {
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal,
      headers: {
        Accept: "application/json", "Content-Type": "application/json",
        token: token.data, "x-partner-token": partnerToken.data,
      },
      body: JSON.stringify({
        SenderZipCode: originPostalCode,
        RecipientZipCode: destinationPostalCode,
        RecipientCountry: "BR",
        ShipmentItemValue: invoiceValueCents / 100,
        Services: { DeclaredValue: false, ReceiptNotification: false, OwnHand: false },
        Volumes: [{
          Weight: parcel.weightGrams / 1000, Length: parcel.lengthCm, Width: parcel.widthCm, Height: parcel.heightCm,
        }],
      }),
    });
    if (response.status === 401 || response.status === 403) {
      throw new ShippingError("Confira as credenciais e as permissões de pós-cotação da Frenet.", 503);
    }
    if (response.status === 429) throw new ShippingError("A Frenet está ocupada. Aguarde e tente novamente.", 503);
    if (!response.ok) throw new ShippingError("A Frenet não conseguiu atender a cotação de etiqueta.", 502);
    const body: unknown = await response.json().catch(() => {
      if (signal.aborted) throw new ShippingError("Não foi possível consultar a Frenet agora. Tente novamente em instantes.", 503);
      throw new ShippingError("A Frenet retornou uma cotação de etiqueta inválida.", 502);
    });
    return parseLabelQuotes(body);
  } catch (error) {
    if (error instanceof ShippingError) throw error;
    throw new ShippingError("Não foi possível consultar a Frenet agora. Tente novamente em instantes.", 503);
  }
}
