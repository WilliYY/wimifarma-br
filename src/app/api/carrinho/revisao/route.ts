import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { cartReviewRequestSchema } from "@/features/products/cart-review";
import { moneyToCents } from "@/features/orders/checkout";
import { limitPaymentRequest, paymentHeaders, paymentJson } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    limitPaymentRequest(request, "cart-review", 15);
    const parsed = cartReviewRequestSchema.safeParse(await paymentJson(request, 4096));
    if (!parsed.success) throw new PaymentError("Informe até 30 produtos diferentes para revisar o carrinho.", 422);
    const products = await getPrisma().product.findMany({
      where: { id: { in: parsed.data.productIds }, status: "ACTIVE", deletedAt: null },
      select: { id: true, name: true, slug: true, category: true, imageUrl: true, price: true, promotionalPrice: true, stock: true, requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true },
    });
    return NextResponse.json({ data: { products: products.map(product => ({
      id: product.id, name: product.name, slug: product.slug, category: product.category, imageUrl: product.imageUrl,
      unitPriceCents: moneyToCents((product.promotionalPrice ?? product.price).toString()),
      originalPriceCents: product.promotionalPrice ? moneyToCents(product.price.toString()) : null,
      stock: product.stock, requiresPrescription: product.requiresPrescription,
      prescriptionType: product.prescriptionType, isPopularPharmacy: product.isPopularPharmacy,
    })) } }, { headers: paymentHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : "Não foi possível revisar o carrinho. Tente novamente." }, { status: error instanceof PaymentError ? error.status : 503, headers: paymentHeaders });
  }
}
