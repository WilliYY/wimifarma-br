import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";
import { applyLoyaltyPolicyPlan, createLoyaltyPolicyPlan, loyaltyPolicyPlanSha, parseLoyaltyPolicyPlan, MAX_POLICY_TARGETS, POLICY_PLAN_TTL_MS } from "./policy-migration";

const now = new Date("2026-11-02T14:00:00.000Z");
const sourceSha = "a".repeat(40);
const actorId = "synthetic-admin";
const updatedAt = new Date("2026-11-01T00:00:00.000Z");
const options = { actorId, sourceSha, now };

function fixture() {
  let customers = [{ id: "customer-a", status: "ACTIVE", updatedAt }, { id: "customer-b", status: "ACTIVE", updatedAt }];
  let products = [{ id: "product-a", ean: "7890000000001", updatedAt, status: "ACTIVE", deletedAt: null, cashbackEnabled: true, cashbackRateBps: 200, requiresPrescription: false, isPopularPharmacy: false, wimicoinsEnabled: true },
    { id: "product-b", ean: null, updatedAt, status: "DRAFT", deletedAt: null, cashbackEnabled: true, cashbackRateBps: 300, requiresPrescription: true, isPopularPharmacy: false, wimicoinsEnabled: false }];
  let memberships = new Map<string, { active: boolean }>();
  let audits: { data: { action: string; entityId?: string } }[] = [];
  const events: string[] = [];
  let admin = true;
  let failAudit: boolean | string = false;
  let writes = 0;
  let overflow = false;
  let onLock: ((query: string, values: unknown[]) => void) | undefined;
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => { const query = strings.join("?"); events.push(query + values.join()); onLock?.(query, values); return []; },
    user: { findFirst: async () => admin ? { id: actorId, role: "ADMIN" } : null },
    customer: {
      findMany: async () => overflow ? Array.from({ length: MAX_POLICY_TARGETS + 1 }, (_, i) => ({ id: `customer-${String(i).padStart(6, "0")}`, status: "ACTIVE", updatedAt })) : customers.filter(c => c.status === "ACTIVE" && !memberships.has(c.id)),
      findUnique: async ({ where }: { where: { id: string } }) => { events.push(`check:${where.id}`); return customers.find(c => c.id === where.id) ?? null; },
      findFirst: async ({ where }: { where: { id: string; status: string } }) => customers.find(c => c.id === where.id && c.status === where.status) ?? null,
    },
    clubMembership: {
      findUnique: async ({ where }: { where: { customerId: string } }) => memberships.get(where.customerId) ?? null,
      create: async ({ data }: { data: { customerId: string } }) => { assert.ok(!memberships.has(data.customerId)); writes++; events.push(`write:${data.customerId}`); memberships.set(data.customerId, { active: true }); return { active: true }; },
    },
    product: {
      findMany: async () => products.filter(p => p.deletedAt === null && p.cashbackEnabled && p.cashbackRateBps !== 100),
      findUnique: async ({ where }: { where: { id: string } }) => { events.push(`check:${where.id}`); return products.find(p => p.id === where.id) ?? null; },
      update: async ({ where, data }: { where: { id: string }; data: { cashbackRateBps: number } }) => {
        assert.deepEqual(Object.keys(data), ["cashbackRateBps"]); writes++; events.push(`write:${where.id}`);
        const product = products.find(p => p.id === where.id)!; product.cashbackRateBps = data.cashbackRateBps; return { id: product.id };
      },
    },
    auditLog: {
      findFirst: async ({ where }: { where: { action: string; entityId: string } }) => audits.find(a => a.data.action === where.action && a.data.entityId === where.entityId) ?? null,
      create: async (input: { data: { action: string; entityId?: string } }) => { if (failAudit === true || failAudit === input.data.action) throw new Error("synthetic audit failure"); audits.push(input); },
    },
  };
  const db = { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => {
    const before = { customers: structuredClone(customers), products: structuredClone(products), memberships: structuredClone(memberships), audits: structuredClone(audits), writes };
    try { return await run(tx); } catch (error) { customers = before.customers; products = before.products; memberships = before.memberships; audits = before.audits; writes = before.writes; throw error; }
  } } as unknown as PrismaClient;
  return { db, events, customers: () => customers, products: () => products, memberships: () => memberships, audits: () => audits, writes: () => writes,
    denyAdmin: () => { admin = false; }, failAudit: (action?: string) => { failAudit = action ?? true; }, overflow: () => { overflow = true; },
    onLock: (callback: (query: string, values: unknown[]) => void) => { onLock = callback; } };
}

test("dry run cria dois planos separados sem escrever e preserva seleção manual de todos os status", async () => {
  const f = fixture();
  f.memberships().set("customer-b", { active: false });
  const customers = await createLoyaltyPolicyPlan(f.db, { ...options, kind: "customers" });
  const cashback = await createLoyaltyPolicyPlan(f.db, { ...options, kind: "cashback" });
  assert.deepEqual(customers.targets.map(t => t.id), ["customer-a"]);
  assert.deepEqual(cashback.targets.map(t => t.id), ["product-a", "product-b"]);
  assert.equal(f.writes(), 0); assert.equal(f.audits().length, 0);
  assert.doesNotMatch(JSON.stringify([customers, cashback]), /email|phone|password|balance|consent/);
});

for (const kind of ["customers", "cashback"] as const) {
  test(`${kind}: valida todos antes de escrever, audita e repetição não escreve nem audita`, async () => {
    const f = fixture();
    const plan = await createLoyaltyPolicyPlan(f.db, { ...options, kind });
    const apply = { ...options, expectedSha: loyaltyPolicyPlanSha(plan) };
    const beforeProducts = structuredClone(f.products());
    assert.deepEqual(await applyLoyaltyPolicyPlan(f.db, plan, apply), { applied: 2, alreadyApplied: false });
    assert.ok(f.events.lastIndexOf(`check:${kind === "customers" ? "customer-b" : "product-b"}`) < f.events.findIndex(e => e.startsWith("write:")));
    const count = f.audits().length;
    assert.deepEqual(await applyLoyaltyPolicyPlan(f.db, plan, apply), { applied: 0, alreadyApplied: true });
    assert.equal(f.audits().length, count); assert.equal(f.writes(), 2);
    if (kind === "customers") assert.deepEqual(f.products(), beforeProducts);
    else assert.deepEqual(f.products().map(p => ({ ...p, cashbackRateBps: 200 })), beforeProducts.map(p => ({ ...p, cashbackRateBps: 200 })));
  });

  test(`${kind}: ator revogado, fonte divergente, plano expirado ou adulterado não escreve`, async () => {
    for (const mode of ["actor", "source", "expired", "hash", "future", "actorMismatch"] as const) {
      const f = fixture(); const plan = await createLoyaltyPolicyPlan(f.db, { ...options, kind });
      const apply = { ...options, expectedSha: loyaltyPolicyPlanSha(plan) };
      if (mode === "actor") f.denyAdmin();
      if (mode === "source") apply.sourceSha = "b".repeat(40);
      if (mode === "expired") apply.now = new Date(now.getTime() + 31 * 60_000);
      if (mode === "future") apply.now = new Date(now.getTime() - 1);
      if (mode === "hash") apply.expectedSha = "0".repeat(64);
      if (mode === "actorMismatch") apply.actorId = "other-admin";
      await assert.rejects(applyLoyaltyPolicyPlan(f.db, plan, apply));
      assert.equal(f.writes(), 0); assert.equal(f.audits().length, 0);
    }
  });

  test(`${kind}: CAS de último alvo e falha de auditoria revertem o lote inteiro`, async () => {
    for (const mode of ["cas", "audit", "summaryAudit"] as const) {
      const f = fixture(); const plan = await createLoyaltyPolicyPlan(f.db, { ...options, kind });
      if (mode === "cas") (kind === "customers" ? f.customers() : f.products())[1].updatedAt = now;
      else f.failAudit(mode === "summaryAudit" ? "LOYALTY_POLICY_APPLIED" : undefined);
      await assert.rejects(applyLoyaltyPolicyPlan(f.db, plan, { ...options, expectedSha: loyaltyPolicyPlanSha(plan) }));
      assert.equal(f.writes(), 0); assert.equal(f.audits().length, 0); assert.equal(f.memberships().size, 0);
      assert.deepEqual(f.products().map(p => p.cashbackRateBps), [200, 300]);
    }
  });
}

test("adesão inativa criada depois do plano bloqueia todo o lote", async () => {
  const f = fixture(); const plan = await createLoyaltyPolicyPlan(f.db, { ...options, kind: "customers" });
  f.memberships().set("customer-b", { active: false });
  await assert.rejects(applyLoyaltyPolicyPlan(f.db, plan, { ...options, expectedSha: loyaltyPolicyPlanSha(plan) }));
  assert.equal(f.writes(), 0); assert.deepEqual(f.memberships().get("customer-b"), { active: false });
});

test("rejeita plano excessivo, desconhecido, duplicado e TTL adulterado", async () => {
  const f = fixture(); const plan = await createLoyaltyPolicyPlan(f.db, { ...options, kind: "customers" });
  for (const bad of [{ ...plan, extra: true }, { ...plan, targets: [plan.targets[0], plan.targets[0]] }, { ...plan, expiresAt: new Date(now.getTime() + 31 * 60_000).toISOString() }]) assert.throws(() => parseLoyaltyPolicyPlan(bad));
  f.overflow(); await assert.rejects(createLoyaltyPolicyPlan(f.db, { ...options, kind: "customers" }));
  f.denyAdmin(); await assert.rejects(createLoyaltyPolicyPlan(f.db, { ...options, kind: "customers" }));
});

test("zero alvos é no-op sem auditoria", async () => {
  const f = fixture(); f.memberships().set("customer-a", { active: true }); f.memberships().set("customer-b", { active: false });
  const plan = await createLoyaltyPolicyPlan(f.db, { ...options, kind: "customers" });
  assert.deepEqual(await applyLoyaltyPolicyPlan(f.db, plan, { ...options, expectedSha: loyaltyPolicyPlanSha(plan) }), { applied: 0, alreadyApplied: false });
  assert.equal(f.audits().length, 0);
});

test("identidade e flags de cashback alteradas bloqueiam o lote mesmo com updatedAt igual", async () => {
  for (const change of [{ ean: "7890000000002" }, { status: "ARCHIVED" }, { deletedAt: now }, { cashbackEnabled: false }, { cashbackRateBps: 100 }, { requiresPrescription: false }, { isPopularPharmacy: true }, { wimicoinsEnabled: true }]) {
    const f = fixture(); const plan = await createLoyaltyPolicyPlan(f.db, { ...options, kind: "cashback" });
    Object.assign(f.products()[1], change);
    await assert.rejects(applyLoyaltyPolicyPlan(f.db, plan, { ...options, expectedSha: loyaltyPolicyPlanSha(plan) }));
    assert.equal(f.writes(), 0); assert.equal(f.audits().length, 0);
  }
});

test("cashback expirado durante o último lock não executa a primeira escrita", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: now.getTime() });
  const f = fixture();
  const plan = await createLoyaltyPolicyPlan(f.db, { ...options, kind: "cashback" });
  f.onLock((query, values) => {
    if (query.includes('FROM "Product"') && query.includes("FOR UPDATE") && values[0] === "product-b") t.mock.timers.tick(POLICY_PLAN_TTL_MS);
  });
  await assert.rejects(applyLoyaltyPolicyPlan(f.db, plan, { actorId, sourceSha, expectedSha: loyaltyPolicyPlanSha(plan) }), /expirado/);
  assert.equal(f.writes(), 0); assert.equal(f.audits().length, 0);
  assert.deepEqual(f.products().map(p => p.cashbackRateBps), [200, 300]);
});
