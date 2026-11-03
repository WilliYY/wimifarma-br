import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { estimatedReviewSha256 as hash } from "../src/features/shipping/estimated-review";
import { reviewEstimatedShippingBatch as review } from "./review-estimated-shipping";

// This executable never reads DATABASE_URL or uses the application's Prisma singleton.
const source = { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 300,
  lengthCm: 24, widthCm: 15, heightCm: 10, reference: null, cargoKinds: ["unspecified"], approvedServiceIds: [] };
const settings = { enabled: true, environment: "production", originPostalCode: "87525000", preparationDays: 1,
  serviceIds: [1, 3], contactEmail: "synthetic@example.invalid" };
const actor = "qa-admin";
let lastPassed = "startup";
type Hook = (model: string, method: string) => Promise<void>;

/** Only observation is interposed; all reads, locks and writes still reach PostgreSQL. */
function observed(db: PrismaClient, after: Hook): Pick<PrismaClient, "$transaction"> {
  return { $transaction: (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => db.$transaction(async tx => {
    const wrapped = new Proxy(tx, { get(target, model) {
      const delegate = Reflect.get(target, model);
      if (!["user", "shippingIntegration", "product"].includes(String(model))) return typeof delegate === "function" ? delegate.bind(target) : delegate;
      return new Proxy(delegate, { get(object, method) {
        const operation = Reflect.get(object, method);
        if (typeof operation !== "function") return operation;
        return async (...args: unknown[]) => { const value = await Reflect.apply(operation, object, args); await after(String(model), String(method)); return value; };
      } });
    } });
    return callback(wrapped);
  }, options) } as Pick<PrismaClient, "$transaction">;
}

async function main() {
  const raw = process.env.QA_DATABASE_URL;
  assert.ok(raw, "QA_DATABASE_URL obrigatória; nenhum fallback permitido.");
  const url = new URL(raw);
  assert.ok(["postgresql:", "postgres:"].includes(url.protocol));
  assert.equal(decodeURIComponent(url.username), "qa_shipping_user");
  assert.match(url.hostname, /^wimi-shipping-qa-[a-z0-9-]+$/);
  assert.match(url.pathname, /^\/wimi_shipping_qa_[a-z0-9_]+$/);
  assert.equal(url.search, "", "Parâmetros de conexão não permitidos no QA.");
  assert.ok(process.env.QA_MIGRATIONS_DIR, "QA_MIGRATIONS_DIR obrigatória.");
  const pool = new Pool({ connectionString: raw, max: 4 });
  const writerPool = new Pool({ connectionString: raw, max: 1, application_name: "qa-shipping-writer" });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const writer = new PrismaClient({ adapter: new PrismaPg(writerPool) });
  let passed = 0;
  const pass = (name: string, details: object = {}) => { passed++; lastPassed = name; console.log(JSON.stringify({ case: name, status: "PASS", ...details })); };
  try {
    const identity = await pool.query("SELECT current_database() AS db, current_user AS username");
    assert.equal(identity.rows[0].db, url.pathname.slice(1));
    assert.equal(identity.rows[0].username, "qa_shipping_user");
    const tables = await pool.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')");
    assert.equal(tables.rows[0].n, 0, "Bootstrap exige banco inicialmente vazio.");
    const dir = process.env.QA_MIGRATIONS_DIR;
    for (const name of (await readdir(dir, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name).sort()) {
      await pool.query(await readFile(join(dir, name, "migration.sql"), "utf8"));
    }
    pass("isolated-empty-database-bootstrap");
    await db.user.create({ data: { id: actor, name: "ADMIN sintético QA", email: "qa-admin@example.invalid", passwordHash: "not-a-login-hash", role: "ADMIN" } });
    await db.shippingIntegration.create({ data: { id: "melhor-envio", settings } });
    // Synthetic EAN-13 codes with valid check digits; no real product information.
    const eans = ["2000000000015", "2000000000022", "2000000000039"];
    for (let i = 0; i < 3; i++) await db.product.create({ data: { id: `qa-product-${i}`, name: `Higiene sintética QA ${i}`,
      slug: `qa-product-${i}`, ean: eans[i], eanNormalized: `0${eans[i]}`, category: "Higiene", price: "10.00", stock: 2,
      status: "ACTIVE", shippingProfile: i === 2 ? Prisma.DbNull : source, requiresPrescription: i === 2 } });
    const snapshot = async () => ({ products: await db.product.findMany({ orderBy: { id: "asc" } }), audits: await db.auditLog.findMany({ orderBy: { id: "asc" } }),
      users: await db.user.findMany({ orderBy: { id: "asc" } }), integrations: await db.shippingIntegration.findMany({ orderBy: { id: "asc" } }) });
    const manifest = async (ids = ["qa-product-0", "qa-product-1"]) => {
      const rows = await db.product.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } });
      const products = rows.map(row => ({ action: "REVIEW_ESTIMATED" as const, productId: row.id, expectedEan: row.ean!, expectedName: row.name,
        expectedUpdatedAt: row.updatedAt.toISOString(), expectedShippingProfile: row.shippingProfile,
        expectedProfileSha256: hash(row.shippingProfile), cargoKinds: ["general"], approvedServiceIds: [1, 3] }));
      return { policyVersion: "review-estimated-shipping-v1", products, manifestSha256: hash(products) };
    };
    const reset = async () => {
      await db.product.updateMany({ where: { id: { in: ["qa-product-0", "qa-product-1"] } }, data: { shippingProfile: source } });
      await db.user.update({ where: { id: actor }, data: { isActive: true } });
      await db.shippingIntegration.update({ where: { id: "melhor-envio" }, data: { settings, revision: { increment: 1 } } });
    };
    let input = await manifest(), before = await snapshot();
    let plan = await review(db, input, actor);
    assert.deepEqual(await snapshot(), before); pass("dry-run-zero-writes");
    await review(db, input, actor, true, plan.planSha256);
    let after = await snapshot();
    assert.equal(after.audits.length - before.audits.length, 2);
    assert.deepEqual(after.users, before.users); assert.deepEqual(after.integrations, before.integrations);
    for (let i = 0; i < 2; i++) {
      const { shippingProfile: oldProfile, updatedAt: oldTime, ...oldRow } = before.products[i];
      const { shippingProfile: newProfile, updatedAt: newTime, ...newRow } = after.products[i];
      assert.deepEqual(newRow, oldRow); assert.ok(oldProfile && oldTime && newTime);
      assert.deepEqual(newProfile, { ...source, enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1, 3] });
      const audit = after.audits.find(a => a.entityId === newRow.id)!;
      assert.equal(audit.userId, actor); assert.equal(audit.action, "PRODUCT_ESTIMATED_SHIPPING_REVIEWED");
      assert.equal((audit.metadata as Record<string, unknown>).planSha256, plan.planSha256);
    }
    assert.deepEqual(after.products[2], before.products[2]); pass("apply-two-profiles-and-two-audits");
    await assert.rejects(review(db, input, actor, true, plan.planSha256));
    assert.deepEqual(await snapshot(), after); pass("replay-no-duplicate");
    await reset(); input = await manifest(); plan = await review(db, input, actor); before = await snapshot();
    await assert.rejects(review(db, { ...input, manifestSha256: "0".repeat(64) }, actor, true, plan.planSha256));
    await assert.rejects(review(db, input, actor, true, "0".repeat(64)));
    assert.deepEqual(await snapshot(), before); pass("manifest-and-plan-hash-refused");
    await db.shippingIntegration.update({ where: { id: "melhor-envio" }, data: { revision: { increment: 1 } } });
    before = await snapshot(); await assert.rejects(review(db, input, actor, true, plan.planSha256));
    assert.deepEqual(await snapshot(), before); pass("configuration-drift-refused");
    await reset(); input = await manifest(); plan = await review(db, input, actor);
    await db.product.update({ where: { id: "qa-product-1" }, data: { name: "Identidade sintética alterada" } });
    before = await snapshot(); await assert.rejects(review(db, input, actor, true, plan.planSha256));
    assert.deepEqual(await snapshot(), before); pass("identity-drift-refused");
    const draftBefore = await db.product.findUniqueOrThrow({ where: { id: "qa-product-2" } });
    const entries = [{ action: "DRAFT_ONLY", productId: draftBefore.id, expectedEan: draftBefore.ean!, expectedName: draftBefore.name,
      expectedUpdatedAt: draftBefore.updatedAt.toISOString(), expectedShippingProfile: null, expectedProfileSha256: hash(null),
      draftProfile: { ...source, cargoKinds: ["medication"] } }];
    const draft = { policyVersion: "review-estimated-shipping-v1", products: entries, manifestSha256: hash(entries) };
    const draftPlan = await review(db, draft, actor); await review(db, draft, actor, true, draftPlan.planSha256);
    const draftAfter = await db.product.findUniqueOrThrow({ where: { id: draftBefore.id } });
    assert.deepEqual(draftAfter.shippingProfile, entries[0].draftProfile);
    assert.equal(draftAfter.requiresPrescription, draftBefore.requiresPrescription);
    assert.equal(draftAfter.prescriptionType, "UNREVIEWED"); pass("null-draft-remains-disabled-unreviewed-rx");
    await reset(); input = await manifest(); plan = await review(db, input, actor); before = await snapshot();
    await pool.query(`CREATE FUNCTION qa_fail_second_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW."entityId" = 'qa-product-1' THEN RAISE EXCEPTION 'QA_SECOND_AUDIT_FAILURE'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER qa_second_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION qa_fail_second_audit()`);
    try { await assert.rejects(review(db, input, actor, true, plan.planSha256), /QA_SECOND_AUDIT_FAILURE/); }
    finally { await pool.query('DROP TRIGGER qa_second_audit ON "AuditLog"; DROP FUNCTION qa_fail_second_audit()'); }
    assert.deepEqual(await snapshot(), before); pass("second-audit-failure-rolls-back-entire-batch");

    for (const target of ["user", "shippingIntegration", "product"] as const) {
      await reset(); input = await manifest(); plan = await review(db, input, actor); before = await snapshot();
      let reached!: () => void, release!: () => void;
      const ready = new Promise<void>(resolve => { reached = resolve; });
      const gate = new Promise<void>(resolve => { release = resolve; });
      let intercepted = false;
      const facade = observed(db, async (model, method) => {
        if (!intercepted && model === target && method === (target === "user" ? "findFirst" : target === "product" ? "findMany" : "findUnique")) {
          intercepted = true; reached(); await gate;
        }
      });
      const applying = review(facade, input, actor, true, plan.planSha256).then(value => ({ value, error: null }), error => ({ value: null, error }));
      const deadline = Date.now() + 10000;
      let mutation: Promise<unknown> | undefined;
      try {
        while (!intercepted && Date.now() < deadline) { await Promise.race([ready, delay(25)]); }
        assert.ok(intercepted, "A transação não atingiu a leitura observada.");
        mutation = target === "user" ? writer.user.update({ where: { id: actor }, data: { isActive: false } }).then(x => x)
          : target === "shippingIntegration" ? writer.shippingIntegration.update({ where: { id: "melhor-envio" }, data: { settings: { ...settings, enabled: false }, revision: { increment: 1 } } }).then(x => x)
          : writer.product.update({ where: { id: "qa-product-1" }, data: { name: "Identidade concorrente sintética" } }).then(x => x);
        if (target !== "product") {
          let locked = false;
          while (!locked && Date.now() < deadline) {
            const state = await pool.query("SELECT 1 FROM pg_stat_activity WHERE application_name='qa-shipping-writer' AND wait_event_type='Lock'");
            locked = state.rowCount === 1; if (!locked) await delay(25);
          }
          assert.ok(locked, "Atualização concorrente não aguardou lock PostgreSQL.");
        } else { await mutation; }
      } finally { release(); }
      const outcome = await applying; await mutation;
      after = await snapshot();
      if (target === "product") {
        assert.ok(outcome.error, "CAS deve recusar snapshot concorrente obsoleto.");
        assert.equal(after.audits.length, before.audits.length);
        for (let i = 0; i < 2; i++) assert.deepEqual(after.products[i].shippingProfile, source);
        pass("concurrent-product-cas-rolls-back");
      } else {
        if (outcome.error) {
          assert.equal(after.audits.length, before.audits.length);
          for (let i = 0; i < 2; i++) assert.deepEqual(after.products[i].shippingProfile, source);
        } else { assert.equal(after.audits.length - before.audits.length, 2); }
        const next = await manifest(); const stable = await snapshot();
        await assert.rejects(review(db, next, actor, true, plan.planSha256));
        assert.deepEqual(await snapshot(), stable);
        pass(`${target}-concurrent-change-serialized-and-next-apply-refused`);
      }
    }
    // SQL compatibility only: this deliberately does not call saveShippingSettings.
    await reset(); before = await snapshot();
    const policy = { enabled: true, fundingMode: "HISTORICAL_MARGIN_SHARE", marginShareBps: 5000, historicalCostMaxAgeHours: 720 };
    let expectedRevision = 0;
    await db.$transaction(async outer => {
      await outer.$queryRaw`SELECT id FROM "User" WHERE id = ${actor} FOR NO KEY UPDATE`;
      assert.ok(await outer.user.findFirst({ where: { id: actor, role: "ADMIN", isActive: true }, select: { id: true } }));
      const outerPid = await outer.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
      const current = await outer.shippingIntegration.findUniqueOrThrow({ where: { id: "melhor-envio" }, select: { revision: true } });
      expectedRevision = current.revision + 1;
      await writer.$transaction(async inner => {
        await inner.$executeRawUnsafe("SET LOCAL lock_timeout = '2000ms'");
        await inner.$executeRawUnsafe("SET LOCAL statement_timeout = '8000ms'");
        const innerPid = await inner.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
        assert.notEqual(innerPid[0].pid, outerPid[0].pid, "O audit deve usar outra conexão PostgreSQL.");
        const changed = await inner.shippingIntegration.updateMany({ where: { id: "melhor-envio", revision: current.revision },
          data: { settings: { ...settings, freeShippingPolicy: policy }, revision: { increment: 1 } } });
        assert.equal(changed.count, 1, "CAS da configuração deve alterar exatamente uma linha.");
        await inner.auditLog.create({ data: { userId: actor, action: "QA_WRAPPER_LOCK_COMPATIBILITY", entity: "ShippingIntegration",
          entityId: "melhor-envio", metadata: { qaOnly: true, freeShippingPolicy: policy } } });
      }, { timeout: 10000, maxWait: 5000 });
    }, { timeout: 20000, maxWait: 5000 });
    after = await snapshot();
    assert.deepEqual(after.products, before.products); assert.deepEqual(after.users, before.users);
    assert.equal(after.integrations[0].revision, expectedRevision);
    assert.deepEqual(after.integrations[0].settings, { ...settings, freeShippingPolicy: policy });
    assert.equal(after.audits.length - before.audits.length, 1);
    const compatibilityAudit = after.audits.filter(audit => audit.action === "QA_WRAPPER_LOCK_COMPATIBILITY");
    assert.equal(compatibilityAudit.length, 1); assert.equal(compatibilityAudit[0].userId, actor);
    pass("outer-no-key-update-allows-inner-cas-and-user-audit-fk", { scope: "SQL compatibility; production helper not invoked" });
    console.log(JSON.stringify({ status: "PASS", cases: passed, products: await db.product.count(), audits: await db.auditLog.count() }));
  } finally {
    await Promise.allSettled([db.$disconnect(), writer.$disconnect()]);
    await Promise.allSettled([pool.end(), writerPool.end()]);
  }
}

main().catch(error => {
  let message = error instanceof Error ? error.message : "Falha QA PostgreSQL.";
  const raw = process.env.QA_DATABASE_URL;
  if (raw) {
    message = message.split(raw).join("[QA connection omitted]");
    try { const password = decodeURIComponent(new URL(raw).password); if (password) message = message.split(password).join("[password omitted]"); } catch { /* Invalid URL is reported without its contents. */ }
  }
  message = message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[connection omitted]");
  console.error(JSON.stringify({ status: "FAIL", after: lastPassed, message })); process.exitCode = 1;
});
