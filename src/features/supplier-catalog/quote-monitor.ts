import { createHash } from "node:crypto";
import type { Prisma, SupplierCode } from "@/generated/prisma/client";
import { PaymentError } from "@/features/payments/schema";
import { normalizeGtin, resolveSupplierOffer } from "./commerce";
import { isUnusualSupplierIncrease, readSupplierPricingBasis } from "./quote-policy";
import { SupplierCatalogOfferSchema, type SupplierCatalogOfferInput } from "./schema";

export type SupplierQuoteInput = Omit<SupplierCatalogOfferInput, "replenishAllocation"> & { evidence?: "REGULAR" | "PROMOTION" };
type QuoteIdentity = { productId: string; supplier: SupplierCode; eanNormalized: string; observedAt: Date };

async function readProduct(tx: Prisma.TransactionClient, productId: string, ean: string, lock: boolean) {
  if (lock) {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "SupplierCatalogOffer" WHERE "productId" = ${productId} ORDER BY id COLLATE "C" FOR UPDATE`;
  }
  const product = await tx.product.findUnique({ where: { id: productId, deletedAt: null }, include: { supplierOffers: true } });
  if (!product || product.inventorySource !== "DISTRIBUTOR" || normalizeGtin(product.ean) !== ean || normalizeGtin(product.eanNormalized ?? product.ean) !== ean) {
    throw new PaymentError("A conferência precisa corresponder ao EAN do produto de distribuidor.", 422);
  }
  return product;
}

async function recordObservation(tx: Prisma.TransactionClient, identity: QuoteIdentity, details: {
  validUntil?: Date;
  unitCostCents: number | null;
  stockQuantity: number | null;
  promotion: boolean;
  evidenceDigest?: string;
  status: string;
  basisBeforeCents: number | null;
  basisAfterCents: number | null;
}) {
  const where = { productId_supplier_eanNormalized_observedAt: identity };
  const existing = await tx.supplierQuoteObservation.findUnique({ where });
  if (existing) {
    if ((existing.evidenceDigest ?? undefined) !== details.evidenceDigest || existing.unitCostCents !== details.unitCostCents || existing.stockQuantity !== details.stockQuantity || existing.promotion !== details.promotion || existing.validUntil?.getTime() !== details.validUntil?.getTime()) {
      throw new PaymentError("Já existe uma observação diferente nesse horário para esta apresentação.", 409);
    }
    return existing;
  }
  return tx.supplierQuoteObservation.create({ data: { ...identity, ...details } });
}

export async function recordSupplierAbsence(tx: Prisma.TransactionClient, input: {
  productId: string; eanNormalized: string; supplier: SupplierCode; observedAt: string; reason: string;
}, options: { apply?: boolean } = {}) {
  const ean = normalizeGtin(input.eanNormalized);
  const observedAt = new Date(input.observedAt);
  const age = Date.now() - observedAt.getTime();
  if (!ean || !Number.isFinite(age) || age < 0 || age >= 300_000) throw new PaymentError("Observe novamente a disponibilidade no fornecedor.", 422);
  const product = await readProduct(tx, input.productId, ean, options.apply === true);
  const basis = resolveSupplierOffer({ ...product, supplierDemandAllowed: true })?.pricingBaseCents ?? readSupplierPricingBasis(product.supplierPricingBasis, ean);
  const result = { status: "UNAVAILABLE", basisBeforeCents: basis, basisAfterCents: basis };
  if (options.apply) await recordObservation(tx, { productId: product.id, supplier: input.supplier, eanNormalized: ean, observedAt }, { ...result, unitCostCents: null, stockQuantity: null, promotion: false });
  return result;
}

export async function recordSupplierQuote(tx: Prisma.TransactionClient, input: SupplierQuoteInput, options: {
  apply?: boolean; confirmIncrease?: boolean; manual?: boolean; replenishAllocation?: boolean;
} = {}) {
  const parsed = SupplierCatalogOfferSchema.safeParse(input);
  if (!parsed.success || !parsed.data.eanNormalized) throw new PaymentError("Revise EAN, custo e validade da conferência.", 422);
  const { replenishAllocation: _replenish, eanNormalized: ean, ...fields } = parsed.data;
  void _replenish;
  const product = await readProduct(tx, fields.productId, ean, options.apply === true);
  const now = Date.now();
  const observedAt = new Date(fields.observedAt);
  const validUntil = new Date(fields.validUntil);
  if (observedAt.getTime() > now || validUntil.getTime() <= now) throw new PaymentError("Informe uma conferência realizada e ainda válida.", 422);
  if (product.requiresPrescription && fields.retailCeilingCents === null) throw new PaymentError("Informe o teto CMED conferido para esta apresentação.", 422);

  const previous = product.supplierOffers.find(offer => offer.supplier === fields.supplier);
  const data = { ...fields, eanNormalized: ean, observedAt, validUntil };
  const promotion = input.evidence === "PROMOTION";
  const evidenceDigest = createHash("sha256").update(JSON.stringify([
    fields.externalCode, fields.available, fields.unitCostCents, fields.stockQuantity, fields.substitutionTaxCents,
    fields.retailCeilingCents, fields.allocationQuantity, fields.commercialCondition ?? null, fields.sourceUrl ?? null,
    validUntil.toISOString(), promotion, options.replenishAllocation === true,
  ])).digest("hex");
  const candidate = { ...data, id: previous?.id ?? "candidate", reservedQuantity: previous?.reservedQuantity ?? 0, committedQuantity: previous?.committedQuantity ?? 0 };
  const existingTerms = resolveSupplierOffer({ ...product, supplierDemandAllowed: true }, 1, now);
  const before = existingTerms?.pricingBaseCents ?? readSupplierPricingBasis(product.supplierPricingBasis, ean);
  const comparedCost = previous?.available && previous.eanNormalized === ean ? previous.unitCostCents : before;
  const supplierOffers = [...product.supplierOffers.filter(row => row !== previous), candidate];
  const productWithCandidate = { ...product, shippingProfile: null, supplierDemandAllowed: true, supplierOffers };
  const next = resolveSupplierOffer(productWithCandidate, 1, now);
  const ownTerms = resolveSupplierOffer({ ...productWithCandidate, supplierOffers: [candidate] }, 1, now);
  const after = fields.available && next ? Math.max(before ?? 0, next.pricingBaseCents) : before;
  const newBasis = after ? { ean, unitCostCents: after } : null;

  let status = fields.available && before !== null && fields.unitCostCents < before
    ? (fields.unitCostCents * 100 >= before * 85 ? "DROP_WITHIN_TOLERANCE" : "DROP_BASE_KEPT") : "APPLIED";
  if (previous && observedAt < previous.observedAt) status = "OLDER_OBSERVATION";
  else if ((!fields.available || fields.stockQuantity === 0) && !options.manual) status = "UNAVAILABLE";
  else if (promotion) status = "PROMOTION_RECORDED";
  else if (fields.available && !ownTerms) status = "INELIGIBLE";
  else if (fields.available && !options.confirmIncrease && (
    (comparedCost !== null && isUnusualSupplierIncrease(comparedCost, fields.unitCostCents)) ||
    (before !== null && after !== null && isUnusualSupplierIncrease(before, after))
  )) status = "SPIKE_REVIEW";
  else if (ownTerms && newBasis && !resolveSupplierOffer({ ...productWithCandidate, supplierPricingBasis: newBasis, supplierOffers: [candidate] }, 1, now)) status = "INELIGIBLE";
  else if (previous && (previous.eanNormalized !== ean || previous.externalCode !== fields.externalCode) && await tx.orderItem.findFirst({
    where: { supplierOfferId: previous.id, order: { status: { notIn: ["COMPLETED", "CANCELED"] } } }, select: { id: true },
  })) status = "OPEN_ORDER";
  else if (await tx.supplierInventoryReservation.findFirst({ where: { status: "ACTIVE", offer: { productId: product.id } }, select: { id: true } })) status = "ACTIVE_RESERVATION";
  else if (!fields.available) status = "WITHDRAWN";

  const canPublish = ["APPLIED", "DROP_WITHIN_TOLERANCE", "DROP_BASE_KEPT", "WITHDRAWN"].includes(status);
  const result = { status, basisBeforeCents: before, basisAfterCents: canPublish ? after : before };
  if (!options.apply) return { ...result, offer: null };

  const identity = { productId: product.id, supplier: fields.supplier, eanNormalized: ean, observedAt };
  const existing = await recordObservation(tx, identity, { ...result, validUntil, stockQuantity: fields.stockQuantity, unitCostCents: fields.unitCostCents, promotion, evidenceDigest });
  if (!canPublish) return { ...result, offer: null };
  if (previous && previous.observedAt.getTime() === observedAt.getTime()) {
    return { status: existing.status, basisBeforeCents: existing.basisBeforeCents, basisAfterCents: existing.basisAfterCents, offer: null };
  }

  const offer = await tx.supplierCatalogOffer.upsert({
    where: { productId_supplier: { productId: product.id, supplier: fields.supplier } },
    create: data,
    update: { ...data, ...(options.replenishAllocation ? { committedQuantity: 0 } : {}), revision: { increment: 1 } },
  });
  if (newBasis && readSupplierPricingBasis(product.supplierPricingBasis, ean) !== after) {
    await tx.product.update({ where: { id: product.id }, data: { supplierPricingBasis: newBasis } });
  }
  await tx.supplierQuoteObservation.update({ where: { id: existing.id }, data: result });
  return { ...result, offer, previousCommittedQuantity: previous?.committedQuantity ?? 0 };
}
