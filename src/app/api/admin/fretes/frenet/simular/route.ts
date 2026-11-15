import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { quoteFrenet } from "@/features/shipping/frenet";
import { quoteFrenetLabel } from "@/features/shipping/frenet-label-quote";
import { limitShippingRequest, noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
import { ShippingError } from "@/features/shipping/schema";

export const runtime = "nodejs";

const ivate = { city: "Ivaté", postalCode: "87525000" };
const origins = [ivate, { city: "Douradina", postalCode: "87485000" }];

const simulationSchema = z.object({
  mode: z.enum(["preview", "label"]).default("preview"),
  postalCode: z.string().regex(/^(?!0{8}$)\d{8}$/),
  weightGrams: z.number().int().min(1).max(30000),
  lengthCm: z.number().positive().max(100),
  widthCm: z.number().positive().max(100),
  heightCm: z.number().positive().max(100),
  invoiceValueCents: z.number().int().positive().max(10000000),
}).strict();

export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;
  try {
    limitShippingRequest(request);
    const parsed = simulationSchema.safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Informe CEP, peso em gramas, dimensões em cm e valor da encomenda.");

    const token = process.env.FRENET_API_TOKEN?.trim();
    if (!token) throw new ShippingError("O token da conta Frenet ainda precisa ser configurado no servidor.", 503);
    const partnerToken = process.env.FRENET_PARTNER_TOKEN?.trim() || undefined;
    const { mode, postalCode, invoiceValueCents, ...dimensions } = parsed.data;
    if (mode === "label") {
      if (!partnerToken) throw new ShippingError("Configure o token de parceiro Frenet para consultar tarifas de etiqueta.", 503);
      const quotes = await quoteFrenetLabel({
        token,
        partnerToken,
        destinationPostalCode: postalCode,
        invoiceValueCents,
        parcel: dimensions,
      });
      return NextResponse.json({ data: [{ ...ivate, available: true, quotes }] }, { headers: noStore });
    }

    const results = await Promise.allSettled(origins.map(origin => quoteFrenet({
      token,
      partnerToken,
      originPostalCode: origin.postalCode,
      destinationPostalCode: postalCode,
      invoiceValueCents,
      items: [{ ...dimensions, quantity: 1 }],
    })));
    if (results.every(result => result.status === "rejected")) {
      if (results.every(result => result.reason instanceof ShippingError && result.reason.status === 503)) {
        throw new ShippingError("A Frenet está indisponível. Confira a conexão, o token e as permissões da conta.", 503);
      }
      throw new ShippingError("A Frenet não respondeu às simulações. Confira a conexão e a habilitação da conta.", 502);
    }
    const data = results.map((result, index) => ({
      ...origins[index],
      available: result.status === "fulfilled",
      quotes: result.status === "fulfilled" ? result.value : [],
    }));
    return NextResponse.json({ data }, { headers: noStore });
  } catch (error) {
    return shippingFailure(error);
  }
}
