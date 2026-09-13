import { NextResponse } from "next/server";
import { lookupPostalCode, PostalCodeError } from "@/features/orders/postal-code";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ cep: string }> }) {
  const { cep } = await params;
  try {
    return NextResponse.json({ data: await lookupPostalCode(cep) }, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PostalCodeError ? error.message : "Nao foi possivel consultar o CEP." }, {
      status: error instanceof PostalCodeError ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
