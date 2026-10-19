import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { cancelRestock, cleanupRestockInterests, getAdminRestock, getCustomerRestock, markRestockNotified, prepareRestockDraft, subscribeRestock } from "./service";

const now = new Date("2026-10-19T12:00:00.000Z");
const session = { user: { id: "customer", role: "CUSTOMER" } };
const input = { productId: "product", whatsapp: true, email: false, consent: true as const };
function assertValidIncludes(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "include" && nested && typeof nested === "object") {
      for (const scalar of ["supplierMarkupBps", "catalogClassification"]) assert.equal(scalar in nested, false, `Invalid scalar field ${scalar} for include statement on model Product`);
    }
    assertValidIncludes(nested);
  }
}
function fixture() {
  const calls: { method: string; input: unknown }[] = [];
  const customer = { id: "customer", status: "ACTIVE", name: "Synthetic", phone: "44999990000", email: "test@example.test" };
  const product = { id: "product", status: "ACTIVE", deletedAt: null, stock: 0, price: "10", requiresPrescription: false, isPopularPharmacy: false, name: "Synthetic", slug: "synthetic", imageUrl: null, supplierOffers: [] };
  const row = { id: "interest", customerId: "customer", productId: "product", status: "WAITING", whatsapp: true, emailEnabled: false, phone: "5544999990000", email: null, consentAt: now, whatsappNotifiedAt: null, emailNotifiedAt: null, expiresAt: new Date(now.getTime() + 86_400_000), createdAt: now, updatedAt: now, product, customer };
  const database = {
    $queryRaw: async () => { calls.push({ method: "lock", input: null }); return [{ id: customer.id }]; },
    customer: { findUnique: async (arg: unknown) => { calls.push({ method: "customer", input: arg }); return customer; } },
    product: { findUnique: async (arg: unknown) => { assertValidIncludes(arg); return product; } },
    restockInterest: {
      findMany: async (arg: unknown) => { assertValidIncludes(arg); return [] as typeof row[]; },
      findUnique: async (arg: unknown) => { assertValidIncludes(arg); return row as typeof row | null; },
      findUniqueOrThrow: async () => row,
      findFirst: async (arg: unknown) => { assertValidIncludes(arg); return row as typeof row | null; },
      count: async () => 0,
      upsert: async (arg: unknown) => { calls.push({ method: "upsert", input: arg }); return row; },
      update: async (arg: { data: object }) => { calls.push({ method: "update", input: arg }); return { ...row, ...arg.data }; },
      updateMany: async (arg: unknown) => { calls.push({ method: "updateMany", input: arg }); return { count: 1 }; },
    },
    auditLog: { create: async (arg: unknown) => { calls.push({ method: "audit", input: arg }); } },
  };
  return { tx: database as unknown as Prisma.TransactionClient, database, row, customer, product, calls };
}
test("session identity and active account are required before accessing interests", async () => {
  const f = fixture();
  await assert.rejects(getCustomerRestock(f.tx, { user: { id: "staff", role: "ADMIN" } }), /Entre/);
  f.customer.status = "BLOCKED";
  await assert.rejects(getCustomerRestock(f.tx, session), /Conta/);
  assert.equal(f.calls.some(call => call.method === "upsert"), false);
});
test("subscription takes customer lock before limit and upserts by owner/product with contact snapshot", async () => {
  const f = fixture();
  await subscribeRestock(f.tx, session, input, now);
  assert.equal(f.calls[0].method, "lock");
  const call = f.calls.find(item => item.method === "upsert")!.input as { where: unknown; update: { expiresAt: Date; phone: string; email: null; consentAt: Date } };
  assert.deepEqual(call.where, { customerId_productId: { customerId: "customer", productId: "product" } });
  assert.equal(call.update.phone, "5544999990000");
  assert.equal(call.update.email, null);
  assert.equal(call.update.expiresAt.getTime() - now.getTime(), 30 * 86_400_000);
  assert.equal(JSON.stringify(f.calls.find(item => item.method === "audit")).includes("9999"), false);
});
test("50 waiting limit blocks a new interest but permits renewal of same active pair", async () => {
  const f = fixture();
  f.database.restockInterest.count = async () => 50;
  f.database.restockInterest.findUnique = async () => null;
  await assert.rejects(subscribeRestock(f.tx, session, input, now), /50/);
  f.database.restockInterest.findUnique = async () => f.row;
  await subscribeRestock(f.tx, session, input, now);
  assert.equal(f.calls.filter(call => call.method === "upsert").length, 1);
});
test("cancellation scopes lookup to current customer, erases contacts and rejects another owner", async () => {
  const f = fixture();
  f.database.restockInterest.findFirst = async arg => { assert.deepEqual(arg, { where: { id: "other", customerId: "customer" }, include: { product: { include: { supplierOffers: true } } } }); return null; };
  await assert.rejects(cancelRestock(f.tx, session, "other", now), /não localizado/);
  f.database.restockInterest.findFirst = async () => f.row;
  const result = await cancelRestock(f.tx, session, "interest", now);
  assert.equal(result.interest.phone, null);
  assert.equal(result.interest.email, null);
  assert.equal(result.interest.status, "CANCELED");
});
test("expiry cleanup is capped at 100 and erases both private contact snapshots", async () => {
  const f = fixture();
  f.database.restockInterest.findMany = async arg => { assert.equal((arg as { take: number }).take, 100); return [f.row]; };
  await cleanupRestockInterests(f.tx, now);
  const call = f.calls.find(item => item.method === "updateMany")!.input as { where: { expiresAt: unknown }; data: unknown };
  assert.deepEqual(call.data, { status: "EXPIRED", phone: null, email: null });
  assert.deepEqual(call.where.expiresAt, { lte: now });
});
test("manual marking rejects stale version, unavailable product, expired consent and missing opt-in", async () => {
  for (const change of ["stale", "unavailable", "expired", "optout", "changed-contact", "inactive"] as const) {
    const f = fixture(); f.product.stock = 1;
    if (change === "stale") f.row.updatedAt = new Date(now.getTime() - 1000);
    if (change === "unavailable") f.product.stock = 0;
    if (change === "expired") f.row.expiresAt = now;
    if (change === "optout") f.row.whatsapp = false;
    if (change === "changed-contact") f.customer.phone = "44988880000";
    if (change === "inactive") f.customer.status = "BLOCKED";
    await assert.rejects(markRestockNotified(f.tx, "admin", { id: "interest", channel: "WHATSAPP", updatedAt: now.toISOString() }, now));
    assert.equal(f.calls.some(item => item.method === "updateMany"), false);
  }
});
test("manual marking uses CAS and closes only when every opted-in channel is recorded", async () => {
  const f = fixture(); f.product.stock = 1;
  await markRestockNotified(f.tx, "admin", { id: "interest", channel: "WHATSAPP", updatedAt: now.toISOString() }, now);
  const first = f.calls.find(item => item.method === "updateMany")!.input as { where: { updatedAt: Date }; data: { status: string; whatsappNotifiedAt: Date; updatedAt: Date } };
  assert.equal(first.data.status, "NOTIFIED");
  assert.deepEqual(first.where.updatedAt, now);
  assert.equal(first.data.updatedAt.getTime(), now.getTime() + 1);
  f.calls.length = 0;
  f.row.emailEnabled = true;
  Object.assign(f.row, { email: f.customer.email });
  await markRestockNotified(f.tx, "admin", { id: "interest", channel: "WHATSAPP", updatedAt: now.toISOString() }, now);
  assert.equal((f.calls.find(item => item.method === "updateMany")!.input as { data: { status: string } }).data.status, "WAITING");
});
test("failed CAS produces conflict and no audit success", async () => {
  const f = fixture(); f.product.stock = 1;
  f.database.restockInterest.updateMany = async () => ({ count: 0 });
  await assert.rejects(markRestockNotified(f.tx, "admin", { id: "interest", channel: "WHATSAPP", updatedAt: now.toISOString() }, now), /Recarregue/);
  assert.equal(f.calls.some(item => item.method === "audit"), false);
});
test("admin pagination/counts use canonical availability and omit assisted products", async () => {
  const f = fixture();
  const ready = { ...f.row, id: "ready", product: { ...f.product, stock: 1 } };
  f.database.restockInterest.findMany = async arg => (arg as { take: number }).take === 100 ? [] : [f.row, ready, { ...ready, product: { ...ready.product, isPopularPharmacy: true } }];
  const result = await getAdminRestock(f.tx, 1, "available", now);
  assert.deepEqual(result.counts, { waiting: 2, available: 1 });
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, "ready");
  assert.equal(result.total, 1);
});
test("admin expires and clears an interest before exposing a changed WhatsApp or email contact", async () => {
  for (const channel of ["phone", "email"] as const) {
    const f = fixture(); f.product.stock = 1;
    if (channel === "phone") f.customer.phone = "44988880000";
    else { f.row.emailEnabled = true; Object.assign(f.row, { email: "previous@example.test" }); }
    f.database.restockInterest.findMany = async arg => (arg as { take: number }).take === 100 ? [] : [f.row];
    const result = await getAdminRestock(f.tx, 1, "all", now);
    assert.equal(result.data.length, 0);
    assert.deepEqual(result.counts, { waiting: 0, available: 0 });
    const update = f.calls.find(call => call.method === "updateMany")!.input as { data: { status: string; phone: unknown; email: unknown } };
    assert.equal(update.data.status, "EXPIRED");
    assert.equal(update.data.phone, null);
    assert.equal(update.data.email, null);
  }
});
test("customer reads expose expired state and no contacts after a consented account contact changes", async () => {
  for (const productId of [undefined, "product"]) {
    const f = fixture(); f.customer.phone = "44988880000";
    f.database.restockInterest.findMany = async arg => (arg as { take?: number }).take === 100 ? [] : [f.row];
    const result = await getCustomerRestock(f.tx, session, productId, now);
    const interest = "interest" in result ? result.interest! : result.interests![0];
    assert.equal(interest.status, "EXPIRED");
    assert.equal(interest.phone, null);
    assert.equal(interest.email, null);
  }
});
test("changing an account contact without opt-in does not expire the consented channel", async () => {
  const f = fixture(); f.customer.email = "new@example.test";
  f.database.restockInterest.findMany = async arg => (arg as { take: number }).take === 100 ? [] : [f.row];
  const result = await getAdminRestock(f.tx, 1, "all", now);
  assert.equal(result.data.length, 1);
  assert.equal(f.calls.some(call => call.method === "updateMany"), false);
});
test("draft preparation revalidates state after a successful admin listing and refuses revoked or stale contacts", async () => {
  for (const change of ["cancel", "phone", "email", "expiry", "stock", "optout", "version", "inactive"] as const) {
    const f = fixture(); f.product.stock = 1;
    f.database.restockInterest.findMany = async arg => (arg as { take: number }).take === 100 ? [] : [f.row];
    const listed = (await getAdminRestock(f.tx, 1, "available", now)).data[0];
    assert.equal(listed.id, "interest");
    assert.equal(listed.updatedAt, now.toISOString());
    if (change === "cancel") f.row.status = "CANCELED";
    if (change === "phone") f.customer.phone = "44988880000";
    if (change === "email") { f.row.emailEnabled = true; Object.assign(f.row, { email: "old@example.test" }); }
    if (change === "expiry") f.row.expiresAt = now;
    if (change === "stock") f.product.stock = 0;
    if (change === "optout") f.row.whatsapp = false;
    if (change === "version") f.row.updatedAt = new Date(now.getTime() + 1);
    if (change === "inactive") f.customer.status = "BLOCKED";
    await assert.rejects(prepareRestockDraft(f.tx, { id: listed.id, channel: "WHATSAPP", updatedAt: listed.updatedAt }, now));
    assert.equal(f.calls.some(call => ["update", "updateMany", "audit"].includes(call.method)), false);
  }
});
test("draft preparation returns canonical generic links without marking or changing the version", async () => {
  const f = fixture(); f.product.stock = 1; f.product.name = "PRIVATE_MEDICINE_NAME";
  const result = await prepareRestockDraft(f.tx, { id: "interest", channel: "WHATSAPP", updatedAt: now.toISOString() }, now);
  const link = new URL(result.draft.url);
  assert.equal(link.origin, "https://wa.me");
  assert.equal(link.pathname, "/5544999990000");
  assert.match(link.searchParams.get("text")!, /https:\/\/wimifarma.com.br\/produto\/synthetic/);
  assert.equal(result.draft.url.includes("PRIVATE_MEDICINE_NAME"), false);
  assert.equal(result.draft.url.includes("test@example.test"), false);
  assert.equal(f.row.updatedAt.toISOString(), now.toISOString());
  assert.equal(f.calls.some(call => ["update", "updateMany", "audit"].includes(call.method)), false);
  f.row.whatsapp = false; f.row.emailEnabled = true; Object.assign(f.row, { email: f.customer.email });
  const email = await prepareRestockDraft(f.tx, { id: "interest", channel: "EMAIL", updatedAt: now.toISOString() }, now);
  assert.match(email.draft.url, /^mailto:test@example.test\?/);
  assert.equal(email.draft.url.includes("PRIVATE_MEDICINE_NAME"), false);
});
test("final manual contact erases persisted snapshots and returned DTO; pending channel keeps snapshots", async () => {
  for (const pendingEmail of [false, true]) {
    const f = fixture(); f.product.stock = 1;
    f.row.emailEnabled = pendingEmail;
    if (pendingEmail) Object.assign(f.row, { email: f.customer.email });
    f.database.restockInterest.updateMany = async arg => {
      f.calls.push({ method: "updateMany", input: arg });
      Object.assign(f.row, (arg as { data: object }).data);
      return { count: 1 };
    };
    const result = await markRestockNotified(f.tx, "admin", { id: "interest", channel: "WHATSAPP", updatedAt: now.toISOString() }, now);
    assert.equal(f.row.status, pendingEmail ? "WAITING" : "NOTIFIED");
    assert.equal(result.interest.phone, pendingEmail ? "5544999990000" : null);
    assert.equal(f.row.phone, pendingEmail ? "5544999990000" : null);
    assert.equal(result.interest.email, pendingEmail ? f.customer.email : null);
    assert.equal(f.row.email, pendingEmail ? f.customer.email : null);
    const history = await getCustomerRestock(f.tx, session, "product", now);
    assert.equal(history.interest?.status, pendingEmail ? "WAITING" : "NOTIFIED");
    assert.equal(history.interest?.phone, pendingEmail ? "5544999990000" : null);
  }
});
