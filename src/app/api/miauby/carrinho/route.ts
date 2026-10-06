import { NextRequest, NextResponse } from "next/server";
import { limitPaymentRequest, paymentJson, paymentHeaders, paymentFailure } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";
import { cartEventKey, cartRequestSchema, commerceMoney, createCartIdentity, formatCommerceItems, readCartIdentity } from "@/features/miauby/commerce-rules";
import { moneyToCents } from "@/features/orders/checkout";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const miaubyCartCookie = "wimi-miauby-cart";
export async function POST(request: NextRequest) {
  try {
    const parsed = cartRequestSchema.safeParse(await paymentJson(request));
    if (!parsed.success) throw new PaymentError("Carrinho inválido.", 422);
    // Clearing a cart must not compete with creation limits and leave a stale alert queued.
    limitPaymentRequest(request, parsed.data.items.length ? "miauby-cart" : "miauby-cart-clear", parsed.data.items.length ? 6 : 20);
    const db = getPrisma();
    const config = await db.miaubyConfig.findUnique({ where: { id: "commerce" } });
    const response = NextResponse.json({ ok: true }, { headers: paymentHeaders });
    if (!config?.enabled || !config.cartAlerts || !process.env.AUTH_SECRET) return response;
    let token = request.cookies.get(miaubyCartCookie)?.value;
    let sessionId = readCartIdentity(token, process.env.AUTH_SECRET);
    if (!parsed.data.items.length) {
      if (sessionId) await db.miaubyEvent.updateMany({ where: { type: "cart", sessionId, status: "PENDING" }, data: { status: "FAILED", lastError: "Carrinho esvaziado antes do envio." } });
      return response;
    }
    if (!sessionId) { token = createCartIdentity(process.env.AUTH_SECRET); sessionId = readCartIdentity(token, process.env.AUTH_SECRET)!; }
    const products = await db.product.findMany({ where: { id: { in: parsed.data.items.map(item => item.productId) }, status: "ACTIVE", prescriptionType: { not: "CONTROLLED" }, OR: [{ requiresPrescription: false }, { prescriptionType: "ORDINARY" }], isPopularPharmacy: false }, select: { id: true, name: true, price: true, promotionalPrice: true, stock: true } });
    const items = parsed.data.items.map(item => ({ ...item, product: products.find(product => product.id === item.productId) }));
    if (items.some(item => !item.product || item.quantity > item.product.stock)) throw new PaymentError("Carrinho indisponível.", 409);
    const total = items.reduce((sum, item) => sum + moneyToCents((item.product!.promotionalPrice ?? item.product!.price).toString()) * item.quantity, 0);
    const key = cartEventKey(sessionId);
    const text = `Miauby · Wimifarma\nCarrinho com produtos — ainda não é pedido ou compra.\nVisitante sem identificação neste aviso.\nSubtotal: ${commerceMoney(total)}\n${formatCommerceItems(items.map(item => ({ name: item.product!.name, quantity: item.quantity })))}`;
    const availableAt = new Date(Date.now() + 15_000);
    await db.$transaction(async tx => {
      await tx.miaubyEvent.upsert({ where: { key }, create: { key, type: "cart", sessionId, availableAt, text }, update: {} });
      // Refresh only an unsent snapshot; an accepted or uncertain event is never resent.
      await tx.miaubyEvent.updateMany({ where: { key, status: "PENDING", attempts: 0 }, data: { text, availableAt } });
    });
    response.cookies.set(miaubyCartCookie, token!, { httpOnly: true, secure: new URL(process.env.AUTH_URL || request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 86_400 });
    return response;
  } catch (error) { return paymentFailure(error); }
}
