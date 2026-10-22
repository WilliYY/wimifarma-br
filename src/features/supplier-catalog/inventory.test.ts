import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { comparePaymentInventoryItems, releaseSupplierShortage, reserveSupplierInventory, settleSupplierOrder, validateSupplierPayment } from "./inventory";
import { toSaleProduct } from "./commerce";

function fixture() {
  const now = Date.now();
  const offer = { id: "offer-test", productId: "p-test", supplier: "ANB", eanNormalized: "01234567890128", unitCostCents: 1000, substitutionTaxCents: null as number | null, available: true, stockQuantity: null, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(now-1000), validUntil: new Date(now+60000) };
  const records: { orderItemId: string; offerId: string; quantity: number; releasedQuantity?: number; unitCostCents: number; status: string }[] = [];
  const offers = [offer];
  const item = { id: "item-test", orderId: "order-test", productId: offer.productId, supplierOfferId: offer.id, inventorySource: "DISTRIBUTOR", quantity: 2, unitPriceCents: 1600 };
  const tx = {
    $queryRaw: async () => [],
    supplierCatalogOffer: { findMany: async () => offers, findUnique: async () => offer, update: async ({ data }: {data: Record<string,{increment?:number;decrement?:number}>}) => { for(const key of ["reservedQuantity","committedQuantity"] as const) { const change=data[key];if(change)offer[key]+=(change.increment??0)-(change.decrement??0); } return offer; } },
    supplierInventoryReservation: {
      findUnique: async ({where}:{where:{orderItemId:string}}) => records.find(r=>r.orderItemId===where.orderItemId)??null,
      create: async ({data}:{data:typeof records[number]}) => {records.push({...data});return data;},
      findMany: async () => records.map(r=>({...r,offer})),
      update: async ({where,data}:{where:{orderItemId:string};data:{status?:string; releasedQuantity?: { increment: number }}}) => {
        const row = records.find(r=>r.orderItemId===where.orderItemId)!;
        if (data.status) row.status = data.status;
        if (data.releasedQuantity) row.releasedQuantity = (row.releasedQuantity ?? 0) + data.releasedQuantity.increment;
        return row;
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, offer, offers, records, item };
}

test("nova oferta mais barata e troca de EAN impedem cobrança antiga", async()=>{
  const f=fixture(); await reserveSupplierInventory(f.tx,f.item);
  f.offers.push({...f.offer,id:"offer-cheaper",unitCostCents:500,reservedQuantity:0,supplier:"PROFARMA",substitutionTaxCents:95});
  await assert.rejects(validateSupplierPayment(f.tx,f.item), /nova condição/);
  f.offers.pop();
  await assert.rejects(validateSupplierPayment(f.tx,f.item,{ean:"7896181915638"}), /nova condição/);
});

test("falta parcial preserva quantity e liquida somente o restante", async () => {
  const f = fixture(); await reserveSupplierInventory(f.tx, f.item);
  await releaseSupplierShortage(f.tx, f.item.id, 1);
  assert.equal(f.records[0].quantity, 2); assert.equal(f.records[0].releasedQuantity, 1);
  assert.equal(f.offer.reservedQuantity, 1);
  await settleSupplierOrder(f.tx, "order-test", "PREPARING", "PAID");
  assert.equal(f.offer.committedQuantity, 1); assert.equal(f.offer.reservedQuantity, 0);
  await releaseSupplierShortage(f.tx, f.item.id, 1);
  assert.equal(f.offer.committedQuantity, 0); assert.equal(f.records[0].quantity, 2);
  await assert.rejects(releaseSupplierShortage(f.tx, f.item.id, 1));
});

test("pagamentos preservam locks físicos ordenados e depois a ordem global das ofertas",()=>{
  const items=[{id:"i1",productId:"A",inventorySource:"DISTRIBUTOR",supplierOfferId:"Z",quantity:1,unitPriceCents:100},{id:"i2",productId:"Z",inventorySource:"DISTRIBUTOR",supplierOfferId:"A",quantity:1,unitPriceCents:100},{id:"i3",productId:"B",quantity:1,unitPriceCents:100},{id:"i4",productId:"A",quantity:1,unitPriceCents:100}];
  assert.deepEqual(items.sort(comparePaymentInventoryItems).map(i=>i.id),["i4","i3","i2","i1"]);
});
test("reserva externa idempotente limita a cota sem acessar estoque físico", async()=>{
  const f=fixture(); await reserveSupplierInventory(f.tx,f.item); await reserveSupplierInventory(f.tx,f.item);
  assert.equal(f.offer.reservedQuantity,2);assert.equal(f.records.length,1);
  await assert.rejects(reserveSupplierInventory(f.tx,{...f.item,id:"other",quantity:4}));
  assert.equal(f.offer.reservedQuantity,2);
});
test("pagamento exige a mesma oferta válida e o preço fotografado",async()=>{
  const f=fixture();await reserveSupplierInventory(f.tx,f.item);
  await validateSupplierPayment(f.tx,f.item);
  f.offer.unitCostCents=1100;await assert.rejects(validateSupplierPayment(f.tx,f.item));
  f.offer.unitCostCents=1000;f.offer.validUntil=new Date(0);await assert.rejects(validateSupplierPayment(f.tx,f.item));
});

test("continuidade permite reservar e pagar o preço da vitrine após expiração sem renovar a oferta", async () => {
  const f = fixture();
  const now = Date.now();
  Object.assign(f.offer, { observedAt: new Date(now - 7 * 86_400_000), validUntil: new Date(now - 6 * 86_400_000) });
  const product = { inventorySource: "DISTRIBUTOR" as const, stock: 17, price: "99.00", eanNormalized: f.offer.eanNormalized, supplierMarkupBps: 4000, supplierOffers: f.offers };
  const before = structuredClone(f.offer);
  const sale = toSaleProduct(product);
  assert.equal(sale.availableForPurchase, true);
  assert.equal(sale.price, "14.00");
  const item = { ...f.item, supplierDemandAllowed: sale.supplierDemandAllowed, unitPriceCents: 1400 };
  await reserveSupplierInventory(f.tx, item, product);
  await reserveSupplierInventory(f.tx, item, product);
  await validateSupplierPayment(f.tx, item, product);
  assert.equal(f.offer.reservedQuantity, 2);
  assert.equal(f.records.length, 1);
  assert.equal(f.records[0].unitCostCents, 1000);
  assert.deepEqual(f.offer, { ...before, reservedQuantity: 2 });
  assert.equal(product.stock, 17);
  Object.assign(f.offer, { available: false });
  await assert.rejects(validateSupplierPayment(f.tx, item, product));
  await assert.rejects(reserveSupplierInventory(f.tx, { ...item, id: "other" }, product));
  assert.equal(f.offer.reservedQuantity, 2);
  await settleSupplierOrder(f.tx, "order-test", "CANCELED", "CANCELED");
  await settleSupplierOrder(f.tx, "order-test", "CANCELED", "CANCELED");
  assert.equal(f.offer.reservedQuantity, 0);
});

test("expiração entre reserva e pagamento mantém preço, mas oferta atual alternativa exige revisar pedido", async () => {
  const f = fixture();
  const item = { ...f.item, supplierDemandAllowed: true };
  await reserveSupplierInventory(f.tx, item);
  f.offer.validUntil = new Date(Date.now() - 1);
  await validateSupplierPayment(f.tx, item);
  await assert.rejects(validateSupplierPayment(f.tx, f.item));
  f.offers.push({ ...f.offer, id: "new-current", supplier: "DM", unitCostCents: 1100, reservedQuantity: 0, validUntil: new Date(Date.now() + 60_000) });
  await assert.rejects(validateSupplierPayment(f.tx, item), /nova condição/);
  assert.equal(f.offer.reservedQuantity, 2);
});

test("perda de ST após reserva impede novo pagamento sem alterar pedido ou reserva", async () => {
  const f = fixture();
  Object.assign(f.offer, { supplier: "PROFARMA", substitutionTaxCents: 95, retailCeilingCents: 5000 });
  const medicine = { requiresPrescription: true, eanNormalized: f.offer.eanNormalized };
  await reserveSupplierInventory(f.tx, f.item, medicine);
  await validateSupplierPayment(f.tx, f.item, medicine);
  const before = structuredClone({ item: f.item, records: f.records });
  Object.assign(f.offer, { substitutionTaxCents: null });
  await assert.rejects(validateSupplierPayment(f.tx, f.item, medicine));
  assert.equal(f.offer.reservedQuantity, 2);
  assert.deepEqual({ item: f.item, records: f.records }, before);
  await assert.rejects(reserveSupplierInventory(f.tx, { ...f.item, id: "other" }, medicine));
  Object.assign(f.offer, { substitutionTaxCents: 0 });
  await validateSupplierPayment(f.tx, f.item, medicine);
});

test("demanda fotografada no item ultrapassa cotas sem alterar a política dos pedidos antigos", async () => {
  const legacy = fixture();
  await assert.rejects(reserveSupplierInventory(legacy.tx, { ...legacy.item, quantity: 150 }));
  assert.equal(legacy.records.length, 0);
  const current = fixture();
  Object.assign(current.offer, { stockQuantity: 100 });
  const item = { ...current.item, quantity: 150, supplierDemandAllowed: true };
  await reserveSupplierInventory(current.tx, item);
  await validateSupplierPayment(current.tx, item);
  assert.equal(current.offer.reservedQuantity, 150);
  assert.equal(current.offer.allocationQuantity, 5);
  assert.equal(current.offer.stockQuantity, 100);
  await settleSupplierOrder(current.tx, "order-test", "CANCELED", "CANCELED");
  await settleSupplierOrder(current.tx, "order-test", "CANCELED", "CANCELED");
  assert.equal(current.offer.reservedQuantity, 0);
  assert.equal(current.records[0].status, "RELEASED");
});

test("reserva e pagamento usam markup configurado e rejeitam mudança posterior", async () => {
  const f = fixture();
  const item = { ...f.item, unitPriceCents: 1400 };
  const product = { eanNormalized: f.offer.eanNormalized, supplierMarkupBps: 4000 };
  await reserveSupplierInventory(f.tx, item, product);
  await validateSupplierPayment(f.tx, item, product);
  await assert.rejects(validateSupplierPayment(f.tx, item, { ...product, supplierMarkupBps: 6000 }), /Preço|condição/);
  assert.equal(f.records[0].unitCostCents, 1000);
  assert.equal(item.unitPriceCents, 1400);
});
test("cancelamento libera uma vez; pagamento consome e estorno não inventa reposição",async()=>{
  const f=fixture();await reserveSupplierInventory(f.tx,f.item);
  await settleSupplierOrder(f.tx,"order-test","CANCELED","CANCELED");await settleSupplierOrder(f.tx,"order-test","CANCELED","CANCELED");
  assert.equal(f.offer.reservedQuantity,0);assert.equal(f.records[0].status,"RELEASED");
  const p=fixture();await reserveSupplierInventory(p.tx,p.item);
  await settleSupplierOrder(p.tx,"order-test","PENDING","PAID");await settleSupplierOrder(p.tx,"order-test","PENDING","PAID");
  assert.equal(p.offer.reservedQuantity,0);assert.equal(p.offer.committedQuantity,2);
  await settleSupplierOrder(p.tx,"order-test","CANCELED","REFUNDED");assert.equal(p.offer.committedQuantity,2);
});
