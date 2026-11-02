import "dotenv/config";
import assert from "node:assert/strict";
import { getPrisma } from "../src/lib/prisma";
import type { Prisma } from "../src/generated/prisma/client";
import { ensureClubMembership } from "../src/features/club/membership";
import {
  applyLoyaltyPolicyPlan, createLoyaltyPolicyPlan, loyaltyPolicyPlanSha,
  parseLoyaltyPolicyPlan, POLICY_PLAN_TTL_MS, type LoyaltyPolicyPlan,
} from "../src/features/club/policy-migration";
import { currentLoyaltyPolicySourceSha, sanitizeLoyaltyPolicyFailure } from "./apply-loyalty-policy";

// Destructive fault injection is permitted only in this exact disposable, empty QA database.
const QA_HOST = "wimifarma-loyalty-qa-db-20261102";
const QA_DATABASE = "wimifarma_loyalty_qa_20261102";
const actorId = "qa-admin";
let stage = "DESTINATION_GUARD";
let assertionsPassed = 0;

function guardDestination() {
  assert.equal(process.env.LOYALTY_DB_QA_ONLY, "synthetic-only");
  const destination = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["postgres:", "postgresql:"].includes(destination.protocol));
  assert.equal(destination.hostname, QA_HOST);
  assert.equal(destination.pathname, `/${QA_DATABASE}`);
  // Query parameters could otherwise override PostgreSQL connection properties.
  assert.equal(destination.search, "");
  assert.equal(destination.hash, "");
  const sourceSha = process.env.QA_SOURCE_SHA;
  assert.match(sourceSha ?? "", /^[a-f0-9]{40}$/);
  assert.equal(sourceSha, currentLoyaltyPolicySourceSha(), "QA source must match the executable revision");
  return sourceSha!;
}

async function seed(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(87164323)::text`;
  await tx.$executeRaw`DO $qa$
    DECLARE item record; row_count bigint;
    BEGIN
      IF current_database() <> 'wimifarma_loyalty_qa_20261102' THEN RAISE EXCEPTION 'QA destination required'; END IF;
      FOR item IN SELECT table_schema, table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
      LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', item.table_schema, item.table_name) INTO row_count;
        IF row_count <> 0 THEN RAISE EXCEPTION 'QA database must be completely empty'; END IF;
      END LOOP;
    END $qa$`;
  await tx.$executeRaw`CREATE FUNCTION public.qa_loyalty_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $qa$
    DECLARE item record; table_data jsonb; result jsonb := '{}'::jsonb;
    BEGIN
      IF current_database() <> 'wimifarma_loyalty_qa_20261102' THEN RAISE EXCEPTION 'QA destination required'; END IF;
      FOR item IN SELECT table_schema, table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
        ORDER BY table_name
      LOOP
        EXECUTE format('SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data::text), ''[]''::jsonb) FROM (SELECT to_jsonb(t) AS row_data FROM %I.%I AS t) AS snapshot_rows', item.table_schema, item.table_name) INTO table_data;
        result := result || jsonb_build_object(item.table_name, table_data);
      END LOOP;
      RETURN result;
    END $qa$`;
  for (const [id, status] of [["qa-customer-missing-a", "ACTIVE"], ["qa-customer-missing-b", "ACTIVE"], ["qa-customer-inactive", "INACTIVE"], ["qa-customer-optout", "ACTIVE"], ["qa-customer-wallet", "ACTIVE"]] as const) {
    await tx.customer.create({ data: { id, status, name: "Synthetic QA Customer", city: "", email: `${id}@example.invalid`, passwordHash: "qa-not-a-valid-password-hash", notes: "Synthetic fixture only" } });
  }
  await tx.user.createMany({ data: [
    { id: actorId, name: "Synthetic QA Admin", email: "qa-admin@example.invalid", passwordHash: "qa-not-a-valid-password-hash", role: "ADMIN", isActive: true },
    { id: "qa-manager", name: "Synthetic QA Manager", email: "qa-manager@example.invalid", passwordHash: "qa-not-a-valid-password-hash", role: "MANAGER", isActive: true },
    { id: "qa-inactive-user", name: "Synthetic QA Inactive", email: "qa-inactive@example.invalid", passwordHash: "qa-not-a-valid-password-hash", role: "CUSTOMER", isActive: false, customerId: "qa-customer-missing-b" },
  ] });
  await tx.clubMembership.createMany({ data: [
    { id: "qa-club-optout", customerId: "qa-customer-optout", active: false, joinedAt: new Date("2026-01-01T00:00:00.000Z") },
    { id: "qa-club-wallet", customerId: "qa-customer-wallet", active: true, joinedAt: new Date("2026-02-01T00:00:00.000Z") },
  ] });
  const wallet = await tx.wimicoinAccount.create({ data: { id: "qa-wimi-wallet", customerId: "qa-customer-wallet", balancePoints: 1234, lifetimeEarnedPoints: 1434, lifetimeRedeemedPoints: 200 } });
  await tx.wimicoinTransaction.createMany({ data: [
    { id: "qa-wimi-credit", accountId: wallet.id, eventKey: "qa-credit", type: "CREDIT", amountPoints: 1434, description: "Synthetic fixture" },
    { id: "qa-wimi-debit", accountId: wallet.id, eventKey: "qa-debit", type: "DEBIT", amountPoints: 200, description: "Synthetic fixture" },
  ] });
  const cashback = await tx.cashbackAccount.create({ data: { id: "qa-cashback-wallet", customerId: "qa-customer-wallet", balance: "12.34", lifetimeEarned: "14.34", lifetimeRedeemed: "2.00" } });
  await tx.cashbackTransaction.createMany({ data: [
    { id: "qa-cashback-credit", accountId: cashback.id, eventKey: "qa-cashback-credit", type: "CREDIT", amount: "14.34", description: "Synthetic fixture" },
    { id: "qa-cashback-debit", accountId: cashback.id, eventKey: "qa-cashback-debit", type: "DEBIT", amount: "2.00", description: "Synthetic fixture" },
  ] });
  for (const [id, status, cashbackEnabled, cashbackRateBps] of [
    ["qa-product-active", "ACTIVE", true, 200], ["qa-product-draft", "DRAFT", true, 200],
    ["qa-product-fixed", "ACTIVE", true, 100], ["qa-product-disabled", "ACTIVE", false, 200],
    ["qa-product-deleted", "ARCHIVED", true, 200],
  ] as const) {
    await tx.product.create({ data: { id, name: "Synthetic QA Product", slug: id, ean: id === "qa-product-active" ? "7890000000001" : null,
      status, cashbackEnabled, cashbackRateBps, wimicoinsEnabled: true, wimicoinsRateBps: 200, price: "42.50", stock: 7,
      deletedAt: id === "qa-product-deleted" ? new Date("2026-01-01T00:00:00.000Z") : null, prescriptionType: "UNREVIEWED" } });
  }
  await tx.restockInterest.create({ data: { id: "qa-marketing-consent", customerId: "qa-customer-missing-a", productId: "qa-product-active", whatsapp: false, emailEnabled: true, email: "qa-consent@example.invalid", consentAt: new Date("2026-01-01T00:00:00.000Z"), expiresAt: new Date("2027-01-01T00:00:00.000Z") } });
  await tx.order.create({ data: { id: "qa-historical-order", number: "QA-SYNTHETIC-1", customerId: "qa-customer-wallet", customerName: "Synthetic QA Customer", customerPhone: "00000000000", fulfillmentMethod: "PICKUP", paymentMethod: "CASH", paymentStatus: "PAID", status: "COMPLETED", subtotalCents: 4250, totalCents: 4250, privacyConsentAt: new Date("2026-01-01T00:00:00.000Z"), cashbackEarnedCents: 85, wimicoinsEarnedPoints: 85,
    items: { create: { id: "qa-historical-item", productId: "qa-product-active", productName: "Synthetic Historical Snapshot", productSlug: "qa-product-active", unitPriceCents: 4250, quantity: 1, totalCents: 4250, cashbackRateBps: 200, cashbackEarnedCents: 85, wimicoinsRateBps: 200, wimicoinsEarnedPoints: 85 } } } });
}

type Snapshot = Record<string, Record<string, unknown>[]>;

async function main() {
  const sourceSha = guardDestination();
  const db = getPrisma();
  try {
    stage = "POSTGRES17_AND_EMPTY_DATABASE";
    const [identity] = await db.$queryRaw<{ database: string; version: number }[]>`SELECT current_database() AS database, current_setting('server_version_num')::integer AS version`;
    assert.equal(identity.database, QA_DATABASE);
    assert.ok(identity.version >= 170000 && identity.version < 180000);
    await db.$transaction(seed, { timeout: 30_000 });
    assertionsPassed++;
    const context = { actorId, sourceSha };
    const snapshot = async (): Promise<Snapshot> => (await db.$queryRaw<{ state: Snapshot }[]>`SELECT public.qa_loyalty_snapshot() AS state`)[0].state;
    const apply = (plan: LoyaltyPolicyPlan) => applyLoyaltyPolicyPlan(db, plan, { ...context, expectedSha: loyaltyPolicyPlanSha(plan) });
    const rejectsWithoutWrites = async (run: () => Promise<unknown>, pattern?: RegExp) => {
      const before = await snapshot();
      if (pattern) await assert.rejects(run, pattern); else await assert.rejects(run);
      assert.deepEqual(await snapshot(), before);
      assertionsPassed++;
    };
    const unchangedTables = (before: Snapshot, after: Snapshot, allowed: string[]) => {
      assert.deepEqual(Object.keys(after), Object.keys(before));
      for (const table of Object.keys(before)) if (!allowed.includes(table)) assert.deepEqual(after[table], before[table]);
    };

    stage = "PLAN_SELECTION_AND_DRY_RUN";
    const baseline = await snapshot();
    const customers = await createLoyaltyPolicyPlan(db, { ...context, kind: "customers" });
    const products = await createLoyaltyPolicyPlan(db, { ...context, kind: "cashback" });
    assert.deepEqual(customers.targets.map(item => item.id), ["qa-customer-missing-a", "qa-customer-missing-b"]);
    assert.deepEqual(products.targets.map(item => item.id), ["qa-product-active", "qa-product-draft"]);
    assert.deepEqual(await snapshot(), baseline);
    assertionsPassed++;

    stage = "ACTOR_HASH_SOURCE_REJECTION";
    await rejectsWithoutWrites(() => createLoyaltyPolicyPlan(db, { actorId: "qa-manager", sourceSha, kind: "customers" }));
    await db.user.update({ where: { id: actorId }, data: { isActive: false } });
    await rejectsWithoutWrites(() => apply(customers));
    await db.user.update({ where: { id: actorId }, data: { isActive: true } });
    await rejectsWithoutWrites(() => applyLoyaltyPolicyPlan(db, customers, { ...context, expectedSha: "0".repeat(64) }));
    await rejectsWithoutWrites(() => applyLoyaltyPolicyPlan(db, customers, { ...context, sourceSha: sourceSha === "a".repeat(40) ? "b".repeat(40) : "a".repeat(40), expectedSha: loyaltyPolicyPlanSha(customers) }));

    stage = "LAST_TARGET_CAS_ROLLBACK";
    const lastCustomer = customers.targets[customers.targets.length - 1];
    await db.customer.update({ where: { id: lastCustomer.id }, data: { updatedAt: new Date(Date.parse(lastCustomer.updatedAt) + 1000) } });
    await rejectsWithoutWrites(() => apply(customers));
    await db.customer.update({ where: { id: lastCustomer.id }, data: { updatedAt: new Date(lastCustomer.updatedAt) } });
    const lastProduct = products.targets[products.targets.length - 1];
    await db.product.update({ where: { id: lastProduct.id }, data: { updatedAt: new Date(Date.parse(lastProduct.updatedAt) + 1000) } });
    await rejectsWithoutWrites(() => apply(products));
    await db.product.update({ where: { id: lastProduct.id }, data: { updatedAt: new Date(lastProduct.updatedAt) } });

    stage = "INDIVIDUAL_AUDIT_FAILURE_REAL_ROLLBACK";
    await db.$executeRaw`CREATE FUNCTION public.qa_loyalty_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $qa$
      BEGIN
        IF current_database() <> 'wimifarma_loyalty_qa_20261102' THEN RAISE EXCEPTION 'QA destination required'; END IF;
        IF NEW.action IN ('CLUB_AUTO_ENROLLED', 'CASHBACK_POLICY_RATE_NORMALIZED') THEN RAISE EXCEPTION 'QA synthetic individual audit failure'; END IF;
        RETURN NEW;
      END $qa$`;
    await db.$executeRaw`CREATE TRIGGER qa_loyalty_fail_audit BEFORE INSERT ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.qa_loyalty_fail_audit()`;
    try {
      await rejectsWithoutWrites(() => apply(customers));
      await rejectsWithoutWrites(() => apply(products));
      stage = "SUMMARY_AUDIT_FAILURE_REAL_ROLLBACK";
      await db.$executeRaw`CREATE OR REPLACE FUNCTION public.qa_loyalty_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $qa$
        BEGIN
          IF current_database() <> 'wimifarma_loyalty_qa_20261102' THEN RAISE EXCEPTION 'QA destination required'; END IF;
          IF NEW.action = 'LOYALTY_POLICY_APPLIED' THEN RAISE EXCEPTION 'QA synthetic summary audit failure'; END IF;
          RETURN NEW;
        END $qa$`;
      await rejectsWithoutWrites(() => apply(customers));
      await rejectsWithoutWrites(() => apply(products));
    } finally {
      await db.$executeRaw`DROP TRIGGER qa_loyalty_fail_audit ON public."AuditLog"`;
      await db.$executeRaw`DROP FUNCTION public.qa_loyalty_fail_audit()`;
    }

    stage = "REAL_LAST_PRODUCT_LOCK_EXPIRATION";
    const beforeLock = await snapshot();
    const agingNow = new Date(Date.now() - POLICY_PLAN_TTL_MS + 1000);
    const agedPlan = parseLoyaltyPolicyPlan({ ...products, createdAt: agingNow.toISOString(), expiresAt: new Date(agingNow.getTime() + POLICY_PLAN_TTL_MS).toISOString() });
    let signalLocked!: () => void;
    const locked = new Promise<void>(resolve => { signalLocked = resolve; });
    let observedLockWait = false;
    const blocker = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${lastProduct.id} FOR UPDATE`;
      signalLocked();
      await new Promise(resolve => setTimeout(resolve, 2000));
      const [waiting] = await tx.$queryRaw<{ waiting: boolean }[]>`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'active' AND wait_event_type = 'Lock' AND query LIKE '%Product%') AS waiting`;
      observedLockWait = waiting.waiting;
    }, { timeout: 10_000 });
    await Promise.race([locked, blocker]);
    await Promise.all([assert.rejects(() => apply(agedPlan), /expirado/), blocker]);
    assert.equal(observedLockWait, true);
    assert.deepEqual(await snapshot(), beforeLock);
    assertionsPassed++;

    stage = "CUSTOMER_APPLY_AND_PRESERVATION";
    const beforeCustomers = await snapshot();
    assert.deepEqual(await apply(customers), { applied: 2, alreadyApplied: false });
    const afterCustomers = await snapshot();
    unchangedTables(beforeCustomers, afterCustomers, ["ClubMembership", "AuditLog"]);
    for (const existing of beforeCustomers.ClubMembership) assert.deepEqual(afterCustomers.ClubMembership.find(item => item.id === existing.id), existing);
    assert.equal(afterCustomers.ClubMembership.length, beforeCustomers.ClubMembership.length + 2);
    assert.equal(await db.clubMembership.count({ where: { customerId: "qa-customer-inactive" } }), 0);
    assert.equal(await db.auditLog.count({ where: { action: "CLUB_AUTO_ENROLLED" } }), 2);
    assert.deepEqual(await apply(customers), { applied: 0, alreadyApplied: true });
    assert.deepEqual(await snapshot(), afterCustomers);
    assertionsPassed++;

    stage = "CASHBACK_APPLY_AND_HISTORICAL_PRESERVATION";
    const beforeProducts = await snapshot();
    assert.deepEqual(await apply(products), { applied: 2, alreadyApplied: false });
    const afterProducts = await snapshot();
    unchangedTables(beforeProducts, afterProducts, ["Product", "AuditLog"]);
    for (const before of beforeProducts.Product) {
      const after = afterProducts.Product.find(item => item.id === before.id)!;
      if (products.targets.some(item => item.id === before.id)) {
        assert.equal(after.cashbackRateBps, 100);
        assert.deepEqual({ ...after, cashbackRateBps: before.cashbackRateBps, updatedAt: before.updatedAt }, before);
      } else assert.deepEqual(after, before);
    }
    assert.deepEqual(await apply(products), { applied: 0, alreadyApplied: true });
    assert.deepEqual(await snapshot(), afterProducts);
    assertionsPassed++;

    stage = "CONCURRENT_AUTO_ENROLLMENT";
    await db.customer.create({ data: { id: "qa-customer-concurrent", name: "Synthetic Concurrent QA", city: "" } });
    const beforeConcurrent = await snapshot();
    await Promise.all([db.$transaction(tx => ensureClubMembership(tx, "qa-customer-concurrent")), db.$transaction(tx => ensureClubMembership(tx, "qa-customer-concurrent"))]);
    const afterConcurrent = await snapshot();
    unchangedTables(beforeConcurrent, afterConcurrent, ["ClubMembership", "AuditLog"]);
    assert.equal(await db.clubMembership.count({ where: { customerId: "qa-customer-concurrent" } }), 1);
    assert.equal(await db.auditLog.count({ where: { action: "CLUB_AUTO_ENROLLED", entityId: "qa-customer-concurrent" } }), 1);
    assertionsPassed++;

    stage = "EMPTY_PLANS_NOOP";
    for (const kind of ["customers", "cashback"] as const) {
      const empty = await createLoyaltyPolicyPlan(db, { ...context, kind });
      assert.equal(empty.targets.length, 0);
      const before = await snapshot();
      assert.deepEqual(await apply(empty), { applied: 0, alreadyApplied: false });
      assert.deepEqual(await snapshot(), before);
    }
    assertionsPassed++;
    console.log(JSON.stringify({ ok: true, postgresMajor: 17, assertionsPassed, productionTouched: false }));
  } finally { await db.$disconnect(); }
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, ...sanitizeLoyaltyPolicyFailure(error), stage, assertionsPassed }));
  process.exitCode = 1;
});
