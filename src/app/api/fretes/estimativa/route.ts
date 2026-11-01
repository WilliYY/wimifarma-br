import { NextResponse } from "next/server";
import { estimateProductShipping } from "@/features/shipping/public-estimate";
import { publicShippingEstimateRequestSchema } from "@/features/shipping/public-estimate-contract";
import { ShippingError } from "@/features/shipping/schema";
import { limitShippingRequest, noStore, shippingBody, shippingFailure } from "@/features/shipping/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    limitShippingRequest(request);
    const parsed = publicShippingEstimateRequestSchema.safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Confira o CEP, o produto e a quantidade.");
    return NextResponse.json({ data: await estimateProductShipping(parsed.data) }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
