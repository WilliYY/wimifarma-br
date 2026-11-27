import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { SupplierCatalogOfferSchema } from "@/features/supplier-catalog/schema";
import { normalizeGtin, resolveSupplierOffer } from "@/features/supplier-catalog/commerce";
import { recordSupplierQuote } from "@/features/supplier-catalog/quote-monitor";
import { readSupplierPricingBasis } from "@/features/supplier-catalog/quote-policy";
import { limitPaymentRequest, paymentJson, paymentHeaders, paymentFailure } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";

export const dynamic = "force-dynamic";
const manualSchema = SupplierCatalogOfferSchema.safeExtend({ confirmIncrease: z.boolean().default(false), promotion: z.boolean().default(false) });

export async function GET(request: Request) {
  const guard = await requireApiRole(["ADMIN"]); if (guard.response) return guard.response;
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId || productId.length > 100) return NextResponse.json({ error: "Informe o produto." }, { status: 422, headers: paymentHeaders });
  try {
    const db = getPrisma();
    const product = await db.product.findUnique({ where: { id: productId, deletedAt: null }, include: { supplierOffers: { orderBy: { supplier: "asc" } } } });
    const ean = normalizeGtin(product?.ean);
    if (!product || !ean || product.inventorySource !== "DISTRIBUTOR") throw new PaymentError("Produto de distribuidora sem EAN válido.", 404);
    const history = await db.supplierQuoteObservation.findMany({
      where: { productId, eanNormalized: ean, observedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      orderBy: [{ observedAt: "desc" }, { supplier: "asc" }], take: 500,
      select: { id: true, supplier: true, observedAt: true, unitCostCents: true, stockQuantity: true, promotion: true, status: true, basisBeforeCents: true, basisAfterCents: true },
    });
    const basis = resolveSupplierOffer({ ...product, supplierDemandAllowed: true })?.pricingBaseCents ?? readSupplierPricingBasis(product.supplierPricingBasis, ean);
    return NextResponse.json({ data: product.supplierOffers, ean, basis, history }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
export async function POST(request: Request) {
  const guard = await requireApiRole(["ADMIN"]); if (guard.response) return guard.response;
  try {
    limitPaymentRequest(request, "supplier-offers", 20);
    const parsed = manualSchema.safeParse(await paymentJson(request, 8192));
    if (!parsed.success) throw new PaymentError("Revise EAN, custo, disponibilidade e datas da oferta (validade máxima: 24h).", 422);
    const { confirmIncrease, promotion, replenishAllocation, ...input } = parsed.data;
    const now = Date.now();
    if (Date.parse(input.observedAt) > now || Date.parse(input.validUntil) <= now) throw new PaymentError("Informe uma conferência realizada e ainda válida.", 422);
    const result = await getPrisma().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${guard.session!.user.id} FOR SHARE`;
      const actor = await tx.user.findFirst({ where: { id: guard.session!.user.id, role: "ADMIN", isActive: true }, select: { id: true } });
      if (!actor) throw new PaymentError("Acesso administrativo alterado.", 403);
      const review = await recordSupplierQuote(tx, { ...input, evidence: promotion ? "PROMOTION" : "REGULAR" }, { apply: true, manual: true, confirmIncrease, replenishAllocation });
      if (review.status === "OLDER_OBSERVATION") throw new PaymentError("Uma conferência mais recente já foi salva. Recarregue as ofertas.", 409);
      if (review.status === "OPEN_ORDER") throw new PaymentError("Há pedidos em aberto. Preserve o EAN e o código do fornecedor até concluí-los ou cancelá-los.", 409);
      await tx.auditLog.create({ data: { action: "SUPPLIER_OFFER_REVIEWED", entity: "SupplierCatalogOffer", entityId: review.offer?.id ?? input.productId, userId: actor.id, metadata: { supplier: input.supplier, productId: input.productId, revision: review.offer?.revision ?? null, available: input.available, substitutionTaxCents: input.substitutionTaxCents, allocationReplenished: Boolean(review.offer && replenishAllocation), previousCommittedQuantity: "previousCommittedQuantity" in review ? review.previousCommittedQuantity : null, status: review.status, confirmIncrease } } });
      return review;
    });
    return NextResponse.json({ data: result.offer, status: result.status }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
