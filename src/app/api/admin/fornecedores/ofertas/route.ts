import { NextResponse } from "next/server";
import { requireApiRole } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { SupplierCatalogOfferSchema } from "@/features/supplier-catalog/schema";
import { normalizeGtin } from "@/features/supplier-catalog/commerce";
import { limitPaymentRequest, paymentJson, paymentHeaders, paymentFailure } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const guard = await requireApiRole(["ADMIN"]); if (guard.response) return guard.response;
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId || productId.length > 100) return NextResponse.json({ error: "Informe o produto." }, { status: 422, headers: paymentHeaders });
  try {
    return NextResponse.json({ data: await getPrisma().supplierCatalogOffer.findMany({ where: { productId }, orderBy: { supplier: "asc" } }) }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
export async function POST(request: Request) {
  const guard = await requireApiRole(["ADMIN"]); if (guard.response) return guard.response;
  try {
    limitPaymentRequest(request, "supplier-offers", 20);
    const parsed = SupplierCatalogOfferSchema.safeParse(await paymentJson(request, 8192));
    if (!parsed.success) throw new PaymentError("Revise EAN, custo, disponibilidade e datas da oferta (validade máxima: 24h).", 422);
    const input = parsed.data;
    if (Date.parse(input.observedAt) > Date.now() || Date.parse(input.validUntil) <= Date.now()) throw new PaymentError("Informe uma conferência realizada e ainda válida.", 422);
    const offer = await getPrisma().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${input.productId} FOR UPDATE`;
      const actor = await tx.user.findFirst({ where: { id: guard.session!.user.id, role: "ADMIN", isActive: true }, select: { id: true } });
      if (!actor) throw new PaymentError("Acesso administrativo alterado.", 403);
      const product = await tx.product.findUnique({ where: { id: input.productId, deletedAt: null } });
      if (!product || product.inventorySource !== "DISTRIBUTOR" || normalizeGtin(product.ean) !== input.eanNormalized) throw new PaymentError("A oferta precisa corresponder ao EAN do produto de distribuidor.", 422);
      if (product.requiresPrescription && input.retailCeilingCents === null) throw new PaymentError("Informe o teto de venda conferido na CMED para esta apresentação antes de liberar a oferta.", 422);
      const previous = await tx.supplierCatalogOffer.findUnique({ where: { productId_supplier: { productId: product.id, supplier: input.supplier } } });
      if (previous) await tx.$queryRaw`SELECT id FROM "SupplierCatalogOffer" WHERE id = ${previous.id} FOR UPDATE`;
      if (previous && Date.parse(input.observedAt) < previous.observedAt.getTime()) throw new PaymentError("Uma conferência mais recente já foi salva. Recarregue as ofertas.", 409);
      if (previous && (previous.eanNormalized !== input.eanNormalized || previous.externalCode !== input.externalCode) && await tx.orderItem.findFirst({ where: { supplierOfferId: previous.id, order: { status: { notIn: ["COMPLETED", "CANCELED"] } } }, select: { id: true } })) throw new PaymentError("Há pedidos em aberto para esta oferta. Preserve o EAN e o código do fornecedor até concluí-los ou cancelá-los.", 409);
      const { replenishAllocation, ...fields } = input;
      const data = { ...fields, eanNormalized: input.eanNormalized!, observedAt: new Date(input.observedAt), validUntil: new Date(input.validUntil) };
      const saved = await tx.supplierCatalogOffer.upsert({ where: { productId_supplier: { productId: product.id, supplier: input.supplier } }, create: data, update: { ...data, ...(replenishAllocation ? { committedQuantity: 0 } : {}), revision: { increment: 1 } } });
      await tx.auditLog.create({ data: { action: "SUPPLIER_OFFER_REVIEWED", entity: "SupplierCatalogOffer", entityId: saved.id, userId: actor.id, metadata: { supplier: saved.supplier, productId: product.id, revision: saved.revision, available: saved.available, substitutionTaxCents: saved.substitutionTaxCents, allocationReplenished: replenishAllocation, previousCommittedQuantity: previous?.committedQuantity ?? 0 } } });
      return saved;
    });
    return NextResponse.json({ data: offer }, { headers: paymentHeaders });
  } catch (error) { return paymentFailure(error); }
}
