import { NextResponse } from "next/server";
import { quoteCart } from "@/features/shipping/service";
import { quoteRequestSchema, ShippingError } from "@/features/shipping/schema";
import { limitShippingRequest, noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    limitShippingRequest(request);
    const parsed = quoteRequestSchema.safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Confira o CEP e os itens do carrinho.");
    if (request.headers.get("X-Wimifarma-Shipping-Benefit") !== "1") throw new ShippingError("As condições de frete mudaram. Atualize a página para consultar novamente.", 409);
    return NextResponse.json({ data: await quoteCart(parsed.data.postalCode, parsed.data.items, parsed.data.discountCents ?? 0) }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
