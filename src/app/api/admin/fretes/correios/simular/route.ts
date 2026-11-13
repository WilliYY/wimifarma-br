import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { CorreiosError, getCorreiosConfig, quoteCorreios } from "@/features/shipping/correios";
import { limitShippingRequest, noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
import { ShippingError } from "@/features/shipping/schema";

export const runtime = "nodejs";

const postalCode = z.string().regex(/^(?!0{8}$)\d{8}$/);
const dimension = z.number().int().min(1).max(100);
const simulation = z.object({
  originPostalCode: postalCode,
  destinationPostalCode: postalCode,
  weightGrams: z.number().int().min(1).max(30000),
  lengthCm: dimension,
  widthCm: dimension,
  heightCm: dimension,
}).strict();

export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  try {
    limitShippingRequest(request);
    const parsed = simulation.safeParse(await shippingBody(request));
    if (!parsed.success) {
      throw new ShippingError("Informe CEPs de origem e destino, peso em gramas e dimensões em centímetros inteiros.");
    }

    const config = getCorreiosConfig();
    if (!config) {
      throw new ShippingError("Configure as credenciais do CWS e o cartão de postagem dos Correios no servidor.", 503);
    }

    const data = await quoteCorreios(config, parsed.data);
    return NextResponse.json({ data }, { headers: noStore });
  } catch (error) {
    return shippingFailure(error instanceof CorreiosError ? new ShippingError(error.message, error.status) : error);
  }
}
