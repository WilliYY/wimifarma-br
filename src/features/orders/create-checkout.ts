import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { productCashbackCents } from "@/features/cashback/rules";
import { CashbackRuleError, lockCashbackAccount } from "@/features/cashback/wallet";
import { ClubRuleError, reserveWimicoins } from "@/features/club/wallet";
import { lockWimicoinAccount } from "@/features/club/wallet";
import { lockStoreCreditAccount, reserveStoreCredit, StoreCreditRuleError } from "@/features/store-credit/wallet";
import { productWimicoinsPoints } from "@/features/club/rules";
import { allocateOrderBenefits } from "./benefits";
import { createOrderNumber, prepareCheckoutOrder, type CheckoutRequest } from "./checkout";
import { validateOrderShipping } from "@/features/shipping/service";
import { PaymentError } from "@/features/payments/schema";
import { allocatePixDiscount, PIX_DISCOUNT_PERCENT, pixDiscountCents } from "@/features/payments/pix-discount";
import { queueCommerceOrder } from "@/features/miauby/commerce-service";
import { requiresPrescriptionReview } from "@/features/products/purchase-policy";
import { checkoutPaymentConnections, resolveCheckoutPayment } from "@/features/payments/routing";
import { resolveSupplierOffer, supplierOfferInclude, toSaleProduct } from "@/features/supplier-catalog/commerce";
import { reserveSupplierInventory } from "@/features/supplier-catalog/inventory";
import { getSupplierPreparationEstimate } from "@/features/supplier-catalog/preparation";
import { prescriptionCartFingerprint, validatePrescriptionAttachment, PrescriptionError } from "./prescription-upload";

const orderResultSelect = {
  id: true,
  preparationReadyAt: true, preparationDays: true,
  requiresPrescriptionReview: true,
  cashbackEarnedCents: true, cashbackState: true, cashbackRedeemedCents: true,
  cashbackRedemptionState: true, createdAt: true, fulfillmentMethod: true,
  storeCreditRedeemedCents: true, storeCreditRedemptionState: true,
  wimicoinsEarnedPoints: true, wimicoinsState: true, wimicoinsRedeemedPoints: true, wimicoinsRedemptionState: true,
  number: true, paymentMethod: true, paymentStatus: true, status: true, totalCents: true,
} satisfies Prisma.OrderSelect;

export async function createCheckout(tx: Prisma.TransactionClient, input: CheckoutRequest, sessionCustomerId?: string, isAdmin = false) {
  const coins = input.wimicoinsRedeemPoints ?? 0;
  const credit = input.storeCreditRedeemCents ?? 0;
  const connections = input.paymentMethod === "ONLINE" ? await checkoutPaymentConnections(tx, isAdmin) : null;
  const isTest = connections?.rows.some(row => row.environment === "test") ?? false;
  if (isTest && (!isAdmin || input.cashbackRedeemCents > 0 || coins > 0 || credit > 0 || !input.customer.email?.endsWith("@testuser.com"))) throw new PaymentError("Na homologação, use apenas dados fictícios e e-mail de comprador de teste, sem resgate de saldos.");
  // Customer precedes wallet/product locks, including FK locks acquired by wallet creation.
  if (sessionCustomerId && !isTest) await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${sessionCustomerId} FOR UPDATE`;
  const customer = sessionCustomerId && !isTest ? await tx.customer.findFirst({ where: { id: sessionCustomerId, status: "ACTIVE" }, select: { id: true } }) : null;
  if (input.cashbackRedeemCents > 0 && !customer) throw new CashbackRuleError("Entre na sua conta de cliente para usar cashback.", 401);
  if (coins > 0 && !customer) throw new ClubRuleError("Entre na sua conta para usar WimiCoins.", 401);
  if (credit > 0 && !customer) throw new StoreCreditRuleError("Entre na sua conta para usar créditos de compra.", 401);
  const account = customer && input.checkoutRequestId ? await lockCashbackAccount(tx, customer.id) : null;
  const requestId = input.checkoutRequestId;
  if (requestId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${requestId}, 0))`;
  const hash = requestId ? createHash("sha256").update(JSON.stringify({ ...input, checkoutRequestId: undefined })).digest("hex") : undefined;
  if (requestId) {
    const previous = await tx.order.findUnique({ where: { checkoutRequestId: requestId } });
    if (previous) {
      if (previous.customerId !== (customer?.id ?? null) || previous.checkoutRequestHash !== hash) throw new CashbackRuleError("Este envio ja foi usado. Confira seus pedidos antes de enviar novamente.");
      return tx.order.findUniqueOrThrow({ where: { id: previous.id }, select: orderResultSelect });
    }
  }
  const membership = customer ? await tx.clubMembership.findUnique({ where: { customerId: customer.id }, select: { active: true } }) : null;
  if (coins > 0 && !membership?.active) throw new ClubRuleError("Entre no Club para usar WimiCoins.");
  if (credit > 0 && customer) {
    const creditAccount = await lockStoreCreditAccount(tx, customer.id);
    if (creditAccount.reviewRequired || creditAccount.balanceCents < credit) throw new StoreCreditRuleError("Seu crédito mudou ou está em conferência. Atualize o checkout.");
  }
  if (coins > 0 && customer) await lockWimicoinAccount(tx, customer.id);
  const loadProducts = () => tx.product.findMany({
    select: { ...supplierOfferInclude, ean: true, inventorySource: true, catalogClassification: true, cashbackEnabled: true, cashbackRateBps: true, wimicoinsEnabled: true, wimicoinsRateBps: true, id: true, imageUrl: true, isPopularPharmacy: true, name: true, price: true, promotionalPrice: true, requiresPrescription: true, prescriptionType: true, slug: true, status: true, stock: true },
    where: { id: { in: input.items.map((item) => item.productId) } },
  });
  let products = await loadProducts();
  // Classification may change while a checkout waits. Lock every identity before re-reading.
  const productIds = products.map(p => p.id).sort();
  for (const id of productIds) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
  // Serializa identidade/origem com a edição ADMIN e relê ofertas após obter os locks.
  if (productIds.length) products = await loadProducts();
  const needsPrescriptionUpload = products.some(p => p.prescriptionType === "ANTIMICROBIAL");
  if (needsPrescriptionUpload && (!customer || !input.prescriptionUploadId || !requestId)) throw new PrescriptionError("Entre na sua conta e envie a receita do antimicrobiano antes de concluir.");
  if (!needsPrescriptionUpload && input.prescriptionUploadId) throw new PrescriptionError("Este carrinho não recebe anexo de receita.");
  if (needsPrescriptionUpload) {
    if (!await tx.customer.findFirst({ where: { id: customer!.id, status: "ACTIVE" }, select: { id: true } })) throw new PrescriptionError("Conta de cliente indisponível.", 401);
    await tx.$queryRaw`SELECT id FROM "PrescriptionUpload" WHERE id = ${input.prescriptionUploadId!} FOR UPDATE`;
    const attachment = await tx.prescriptionUpload.findUnique({ where: { id: input.prescriptionUploadId }, select: { customerId: true, orderId: true, expiresAt: true, cartFingerprint: true, submissionId: true } });
    validatePrescriptionAttachment(attachment, customer!.id, prescriptionCartFingerprint(products, input.items), requestId!);
  }
  const prepared = prepareCheckoutOrder(products.map(p => toSaleProduct(p)), input.items);
  if (!prepared.ok) throw new CashbackRuleError(prepared.message, prepared.code === "NOT_FOUND" ? 404 : 409, prepared.code);
  const hasSupplierItems = products.some(p => p.inventorySource === "DISTRIBUTOR");
  if (isTest && hasSupplierItems) throw new PaymentError("Na homologação use produtos locais sintéticos, sem comprometer cotas de distribuidores.", 422);
  const preparation = hasSupplierItems ? getSupplierPreparationEstimate(new Date()) : null;
  const shippingQuote = await validateOrderShipping(tx, input);
  const carrierPriceCents = shippingQuote?.priceCents ?? prepared.deliveryFeeCents;
  const deliveryFeeCents = shippingQuote?.benefit?.customerPriceCents ?? carrierPriceCents;
  const redeem = input.cashbackRedeemCents;
  if (redeem + credit + coins > prepared.subtotalCents || (redeem > 0 && (!account || account.balance.lessThan((redeem / 100).toFixed(2))))) {
    throw new CashbackRuleError("Saldo de cashback alterado ou insuficiente. Atualize o saldo e revise o desconto.");
  }
  let discounts: ReturnType<typeof allocateOrderBenefits>;
  try {
    discounts = allocateOrderBenefits(prepared.items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return { totalCents: item.totalCents, wimicoinsEligible: !product.requiresPrescription && !product.isPopularPharmacy };
    }), redeem, coins, credit);
  } catch { throw new ClubRuleError("Revise os descontos: WimiCoins valem nos itens sem receita e fora da Farmácia Popular.", 422); }
  const onlineMethod = input.onlineMethod ?? "pix";
  const productsAfterWalletCents = prepared.subtotalCents - redeem - coins - credit;
  const pixDiscount = input.paymentMethod === "PIX" || (input.paymentMethod === "ONLINE" && onlineMethod === "pix")
    ? pixDiscountCents(productsAfterWalletCents) : 0;
  const pixDiscounts = allocatePixDiscount(prepared.items.map((item, index) => ({ productSlug: item.productSlug, totalCents: discounts[index].paidCents })), pixDiscount);
  const items = prepared.items.map((item, index) => {
    const product = products.find((p) => p.id === item.productId)!;
    const paidCents = discounts[index].paidCents - pixDiscounts[index];
    const paidUnitCents = Math.floor(paidCents / item.quantity);
    const extraCentUnits = paidCents % item.quantity;
    const baseUnits = item.quantity - extraCentUnits;
    // Distribui todo o valor líquido antes do arredondamento de cada unidade.
    const earned = customer ? productCashbackCents(product, paidUnitCents, baseUnits)
      + (extraCentUnits > 0 ? productCashbackCents(product, paidUnitCents + 1, extraCentUnits) : 0) : 0;
    const earnedPoints = membership?.active ? productWimicoinsPoints(product, paidUnitCents, baseUnits)
      + (extraCentUnits > 0 ? productWimicoinsPoints(product, paidUnitCents + 1, extraCentUnits) : 0) : 0;
    const supplier = product.inventorySource === "DISTRIBUTOR" ? resolveSupplierOffer({ ...product, supplierDemandAllowed: true }, item.quantity) : null;
    if (product.inventorySource === "DISTRIBUTOR" && !supplier) throw new PaymentError("A disponibilidade do distribuidor mudou. Revise o carrinho.", 409);
    return { ...item, supplierDemandAllowed: product.inventorySource === "DISTRIBUTOR", inventorySource: product.inventorySource ?? "PHARMACY", supplierOfferId: supplier?.id, supplierCode: supplier?.supplier,
      cashbackDiscountCents: discounts[index].cashbackDiscountCents, wimicoinsDiscountPoints: discounts[index].wimicoinsDiscountPoints,
      storeCreditDiscountCents: discounts[index].storeCreditDiscountCents,
      cashbackEarnedCents: earned, cashbackRateBps: earned > 0 ? product.cashbackRateBps : 0,
      wimicoinsEarnedPoints: earnedPoints, wimicoinsRateBps: earnedPoints > 0 ? product.wimicoinsRateBps : 0 };
  });
  const cashbackEarnedCents = items.reduce((sum, item) => sum + item.cashbackEarnedCents, 0);
  const wimicoinsEarnedPoints = items.reduce((sum, item) => sum + item.wimicoinsEarnedPoints, 0);
  const totalCents = productsAfterWalletCents - pixDiscount + deliveryFeeCents;
  if (connections && totalCents < 1) throw new PaymentError("Seu saldo cobre o pedido. Escolha o atendimento da farmácia para concluir sem cobrança online.");
  const selected = connections ? await resolveCheckoutPayment(connections, { amountCents: totalCents, method: onlineMethod,
    installments: onlineMethod === "pix" ? 1 : input.onlineInstallments ?? 1 }, tx) : null;
  const integration = selected?.integration;
  const address = input.fulfillmentMethod === "DELIVERY" ? input.address : undefined;
  const order = await tx.order.create({ data: {
    ...(preparation ? { preparationReadyAt: preparation.readyAt, preparationDays: preparation.preparationDays } : {}),
    requiresPrescriptionReview: products.some(requiresPrescriptionReview),
    cashbackEarnedCents, cashbackState: cashbackEarnedCents > 0 ? "PENDING" : "NONE",
    cashbackRedeemedCents: redeem, cashbackRedemptionState: redeem > 0 ? "RESERVED" : "NONE",
    storeCreditRedeemedCents: credit, storeCreditRedemptionState: credit > 0 ? "RESERVED" : "NONE",
    wimicoinsEarnedPoints, wimicoinsState: wimicoinsEarnedPoints > 0 ? "PENDING" : "NONE",
    wimicoinsRedeemedPoints: coins, wimicoinsRedemptionState: coins > 0 ? "RESERVED" : "NONE",
    checkoutRequestId: requestId, checkoutRequestHash: hash,
    addressNumber: address?.number, city: address?.city, complement: address?.complement,
    customerEmail: input.customer.email, customerId: customer?.id, customerName: input.customer.name, customerPhone: input.customer.phone,
    deliveryFeeCents, fulfillmentMethod: input.fulfillmentMethod,
    ...(shippingQuote ? { shippingQuote: { ...shippingQuote, customerPriceCents: deliveryFeeCents, freeShipping: deliveryFeeCents === 0 } } : {}),
    items: { create: items }, neighborhood: address?.neighborhood, notes: input.notes,
    number: createOrderNumber(), paymentMethod: input.paymentMethod, postalCode: address?.postalCode,
    privacyConsentAt: new Date(), state: address?.state, street: address?.street,
    subtotalCents: prepared.subtotalCents, totalCents,
    ...(integration ? { onlinePayment: { create: { idempotencyKey: randomUUID(), provider: integration.id, integrationId: integration.id,
      method: onlineMethod, installments: integration.id === "asaas" && onlineMethod === "card" ? 1 : null, environment: integration.environment,
      integrationRevision: integration.revision, accountId: integration.accountId, amountCents: totalCents } } } : {}),
  } });
  if (needsPrescriptionUpload) {
    const linked = await tx.prescriptionUpload.updateMany({ where: { id: input.prescriptionUploadId, customerId: customer!.id, orderId: null }, data: { orderId: order.id } });
    if (linked.count !== 1) throw new PrescriptionError("Esta receita já foi usada em outro pedido.", 409);
  }
  if (credit > 0 && customer) await reserveStoreCredit(tx, { customerId: customer.id, orderId: order.id, number: order.number, cents: credit });
  if (hasSupplierItems) {
    const supplierItems = await tx.orderItem.findMany({ where: { orderId: order.id, inventorySource: "DISTRIBUTOR" }, orderBy: [{ supplierOfferId: "asc" }, { id: "asc" }] });
    for (const item of supplierItems) await reserveSupplierInventory(tx, item, products.find(product => product.id === item.productId));
  }
  if (selected) await tx.auditLog.create({ data: { action: "PAYMENT_ROUTE_SELECTED", entity: "Order", entityId: order.id,
    metadata: { ...selected.route, integrationRevision: selected.integration.revision, method: onlineMethod, amountCents: totalCents } } });
  if (pixDiscount > 0) await tx.auditLog.create({ data: { action: "PIX_DISCOUNT_APPLIED", entity: "Order", entityId: order.id,
    metadata: { baseCents: productsAfterWalletCents, percent: PIX_DISCOUNT_PERCENT, discountCents: pixDiscount } } });
  if (redeem > 0 && account) {
    const amount = (redeem / 100).toFixed(2);
    await tx.cashbackAccount.update({ where: { id: account.id }, data: { balance: { decrement: amount } } });
    await tx.cashbackTransaction.create({ data: { accountId: account.id, eventKey: `redemption:${order.id}:RESERVED`, type: "DEBIT", amount, reference: order.number, description: `Cashback reservado para desconto - pedido ${order.number}` } });
    await tx.auditLog.create({ data: { action: "CASHBACK_REDEMPTION_RESERVED", entity: "Order", entityId: order.id, metadata: { customerId: customer?.id, amountCents: redeem } } });
  }
  if (coins > 0 && customer) await reserveWimicoins(tx, { customerId: customer.id, orderId: order.id, number: order.number, points: coins });
  await queueCommerceOrder(tx, "order", { ...order, items: items.map(item => ({ name: item.productName, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents,
    ean: products.find(product => product.id === item.productId)?.ean, inventorySource: item.inventorySource, supplierCode: item.supplierCode })) }, isTest);
  return tx.order.findUniqueOrThrow({ where: { id: order.id }, select: orderResultSelect });
}
