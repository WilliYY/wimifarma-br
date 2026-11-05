import assert from "node:assert/strict";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { normalizeGtin } from "../src/features/products/gtin";
import { identitySha256 } from "../src/features/catalog-identities/import-plan";
import { executeCatalogIdentityImport, type CatalogIdentityImportOptions } from "../src/features/catalog-identities/import-service";
import { publicCatalogIdentity } from "../src/features/catalog-identities/public-policy";
import type { CatalogIdentityManifest, CatalogIdentitySourceRow } from "../src/features/catalog-identities/schema";

// This script creates only synthetic fixtures. It never loads dotenv, DATABASE_URL or production settings.
// The operator creates/migrates the exact disposable database first, then drops it afterward.
const usage = `Synthetic PostgreSQL QA only. No migrations, database creation or cleanup is automatic.
Environment:
  CATALOG_IDENTITIES_DB_QA=synthetic-only
  CATALOG_IDENTITIES_QA_DATABASE_URL=postgresql://<qa-role>:<qa-password>@<qa-host>:<port>/qa_catalog_identities_<nonce>
  CATALOG_IDENTITIES_QA_NONCE=<16-32 lowercase hexadecimal characters>
Arguments:
  --target-db qa_catalog_identities_<nonce> --target-host <qa-host> --nonce <nonce>
Allowed hosts: 127.0.0.1, localhost, or wimifarma-catalog-identities-qa-<nonce>.
The database must have all project migrations applied and start with empty business tables.
All fixtures remain in that isolated database for inspection. Drop only that exact database afterward.`;

function destination() {
  const args = process.argv.slice(2);
  assert.equal(args.length, 6, usage);
  const fields = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    assert.ok(["--target-db", "--target-host", "--nonce"].includes(args[index]), "Unknown QA argument.");
    assert.ok(!fields.has(args[index]), "Duplicate QA argument.");
    fields.set(args[index], args[index + 1]);
  }
  assert.equal(process.env.CATALOG_IDENTITIES_DB_QA, "synthetic-only", "Synthetic QA mode required.");
  const nonce = fields.get("--nonce")!;
  assert.match(nonce, /^[a-f0-9]{16,32}$/, "Invalid QA nonce.");
  assert.equal(process.env.CATALOG_IDENTITIES_QA_NONCE, nonce, "QA nonce must match the environment.");
  const database = `qa_catalog_identities_${nonce}`;
  assert.equal(fields.get("--target-db"), database, "The database name must bind the exact QA nonce.");
  const url = new URL(process.env.CATALOG_IDENTITIES_QA_DATABASE_URL ?? "");
  assert.ok(["postgresql:", "postgres:"].includes(url.protocol), "PostgreSQL QA URL required.");
  assert.equal(url.pathname, `/${database}`, "QA URL and explicit target database differ.");
  assert.equal(url.hostname, fields.get("--target-host"), "QA URL and explicit target host differ.");
  assert.ok(["127.0.0.1", "localhost", `wimifarma-catalog-identities-qa-${nonce}`].includes(url.hostname), "Only the isolated QA host is allowed.");
  assert.equal(url.search, "", "Connection query overrides are forbidden.");
  assert.equal(url.hash, "", "Connection fragments are forbidden.");
  return { connectionString: url.href, database, host: url.hostname, nonce };
}

let stage = "DESTINATION_GUARD";
const checks: string[] = [];
const check = (name: string) => { checks.push(name); };
const scenarioTime = new Date();
let sequence = 0;
function withCheckDigit(body: string) {
  const sum = [...body].reverse().reduce((value, digit, index) => value + Number(digit) * (index % 2 ? 1 : 3), 0);
  return body + String((10 - sum % 10) % 10);
}
function nextGtin() { return withCheckDigit("990000" + String(++sequence).padStart(6, "0")); }
function sourceRow(ean = nextGtin()): CatalogIdentitySourceRow {
  return { ean, name: `Sabonete sintético QA ${ean} 90 g`, categoryName: "Higiene sintética", categorySlug: "higiene-sintetica",
    sourceRecord: { synthetic: true, laboratory: "Laboratório sintético QA", presentation: "90 g", privatePfCents: 1234 } };
}
function manifest(rows: CatalogIdentitySourceRow[], actorId: string, reviewed = false): CatalogIdentityManifest {
  return { version: 1, sourceFileSha256: "a".repeat(64), rows, reviews: reviewed ? rows.map(row => ({
    gtinCanonical: normalizeGtin(row.ean)!, identitySha256: identitySha256(row), regulatoryStatus: "NON_MEDICINE",
    medicine: false, nbcal: false, reviewedBy: actorId, reviewedAt: scenarioTime.toISOString(),
    evidence: "Synthetic manufacturer presentation review; fixture only, no real regulatory claim.",
  })) : [] };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
async function deadline<T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(label)), milliseconds); })]); }
  finally { clearTimeout(timer); }
}

async function main() {
  if (process.argv.length === 3 && process.argv[2] === "--help") { console.log(usage); return; }
  const target = destination();
  const pool = new Pool({ connectionString: target.connectionString, max: 6, connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000, options: "-c statement_timeout=15000 -c lock_timeout=3000" });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const transactionOptions = { isolationLevel: "Serializable" as const, maxWait: 5000, timeout: 45000 };
  try {
    stage = "LIVE_TARGET_AND_EMPTY_DATABASE";
    const live = await db.$queryRaw<{ database: string }[]>`SELECT current_database() AS database`;
    assert.equal(live[0]?.database, target.database, "Live database differs from the explicit nonce-bound target.");
    const migration = await db.$queryRaw<{ count: number }[]>`SELECT count(*)::integer AS count FROM "_prisma_migrations"
      WHERE migration_name = '20261105120000_catalog_consultation_identities' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    assert.equal(migration[0]?.count, 1, "Apply the actual project migrations before QA; schema push is insufficient.");
    const counts = await Promise.all([db.user.count(), db.customer.count(), db.order.count(), db.product.count(), db.offer.count(),
      db.catalogIdentity.count(), db.catalogIdentitySuppression.count(), db.auditLog.count(), db.supplierCatalogOffer.count()]);
    assert.ok(counts.every(count => count === 0), "The disposable QA database must start with empty business tables; no records were changed.");
    check("exact_live_nonce_target_and_empty_business_tables");

    stage = "SYNTHETIC_ACTORS";
    const admin = await db.user.create({ data: { name: "Synthetic catalog QA ADMIN", email: `catalog-qa-${target.nonce}@example.invalid`, passwordHash: "disabled-synthetic-fixture", role: "ADMIN" } });
    const staff = await db.user.create({ data: { name: "Synthetic catalog QA STAFF", email: `catalog-staff-${target.nonce}@example.invalid`, passwordHash: "disabled-synthetic-fixture", role: "STAFF" } });
    const run = (input: CatalogIdentityManifest, options: CatalogIdentityImportOptions = {}, actorId = admin.id) => db.$transaction(tx => executeCatalogIdentityImport(tx, input, actorId, { now: scenarioTime, ...options }), transactionOptions);
    const apply = async (input: CatalogIdentityManifest) => {
      const dryRun = await run(input);
      return run(input, { apply: true, expectedPlanSha256: dryRun.planSha256 });
    };
    const product = (ean: string | null, status: "DRAFT" | "ARCHIVED" | "ACTIVE" = "DRAFT", extra: Partial<Prisma.ProductUncheckedCreateInput> = {}) => db.product.create({ data: {
      name: "Synthetic QA product", slug: `catalog-qa-${target.nonce}-${++sequence}`, ean, price: 10, stock: 3, status, ...extra,
    } });
    const identity = (ean: string) => db.catalogIdentity.findUniqueOrThrow({ where: { gtinCanonical: normalizeGtin(ean)! } });
    const commerceSnapshot = async () => JSON.stringify(await Promise.all([
      db.product.findMany({ orderBy: { id: "asc" } }), db.offer.findMany({ orderBy: { id: "asc" } }),
      db.auditLog.count({ where: { entity: { in: ["Product", "Offer"] } } }),
    ]));

    stage = "SQL_GTIN_PARITY_AND_CHECK_CONSTRAINTS";
    const gtinSamples = [withCheckDigit("9000001"), withCheckDigit("90000000001"), nextGtin(), withCheckDigit("1990000000001"), "abc", "1234567890129", "", " 036000291452 "];
    for (const raw of gtinSamples) {
      const sql = await db.$queryRaw<{ gtin: string | null }[]>`SELECT catalog_identity_gtin(${raw}) AS gtin`;
      assert.equal(sql[0].gtin, normalizeGtin(raw), `SQL/domain GTIN mismatch: ${raw}`);
    }
    const rejected = async (canonical: string | null, ean: string | null) => {
      const before = await db.catalogIdentity.count();
      await assert.rejects(db.$executeRaw`INSERT INTO "CatalogIdentity" ("gtinCanonical", "ean", "name", "identitySha256", "sourceFileSha256", "sourceRecord", "updatedAt")
        VALUES (${canonical}, ${ean}, 'Synthetic invalid fixture', ${"a".repeat(64)}, ${"b".repeat(64)}, '{}'::jsonb, CURRENT_TIMESTAMP)`);
      assert.equal(await db.catalogIdentity.count(), before, "Rejected identity must leave no row.");
    };
    await rejected(null, nextGtin());
    await rejected("00000000000001", nextGtin());
    await rejected(withCheckDigit("9000001"), withCheckDigit("9000001"));
    await rejected(normalizeGtin(nextGtin())!, null);
    check("sql_gtin_matches_domain_8_12_13_14_and_rejects_null_invalid_short_canonical");

    stage = "PRODUCT_COLLISIONS_ALL_STATES_AND_BOTH_EAN_FIELDS";
    const collisionRows = [sourceRow(), sourceRow(), sourceRow(), sourceRow()];
    await product(collisionRows[0].ean, "DRAFT");
    await product(collisionRows[1].ean, "ARCHIVED");
    await product(collisionRows[2].ean, "ARCHIVED", { deletedAt: scenarioTime, purgeAt: new Date(scenarioTime.getTime() + 86400000) });
    await product(null, "DRAFT", { eanNormalized: normalizeGtin(collisionRows[3].ean)! });
    const offerProduct = await product(nextGtin(), "ACTIVE");
    await db.offer.create({ data: { title: "Synthetic QA preserved offer", slug: `catalog-offer-${target.nonce}`, productId: offerProduct.id, offerPrice: 9, status: "DRAFT", createdById: admin.id } });
    const beforeImports = await commerceSnapshot();
    const collided = await apply(manifest(collisionRows, admin.id, true));
    assert.equal(collided.counts.suppressed, collisionRows.length);
    assert.equal(await commerceSnapshot(), beforeImports, "Identity import must preserve every Product/Offer field and their audit count.");
    for (const row of collisionRows) assert.equal((await identity(row.ean)).publicState, "SUPPRESSED");
    check("draft_archived_softdeleted_and_normalized_only_products_suppress_without_commerce_changes");

    stage = "HARD_PURGE_BEFORE_AND_AFTER_IDENTITY";
    const beforeRow = sourceRow();
    const beforeProduct = await product(beforeRow.ean);
    await db.product.delete({ where: { id: beforeProduct.id } });
    assert.ok(await db.catalogIdentitySuppression.findUnique({ where: { gtinCanonical: normalizeGtin(beforeRow.ean)! } }));
    await apply(manifest([beforeRow], admin.id, true));
    assert.equal((await identity(beforeRow.ean)).publicState, "SUPPRESSED");
    const afterRow = sourceRow();
    await apply(manifest([afterRow], admin.id, true));
    assert.equal((await identity(afterRow.ean)).publicState, "PUBLIC");
    const afterProduct = await product(afterRow.ean);
    assert.equal((await identity(afterRow.ean)).publicState, "SUPPRESSED");
    await db.product.delete({ where: { id: afterProduct.id } });
    await apply(manifest([afterRow], admin.id, true));
    await db.catalogIdentity.update({ where: { gtinCanonical: normalizeGtin(afterRow.ean)! }, data: { publicState: "PUBLIC", suppressedAt: null } });
    assert.equal((await identity(afterRow.ean)).publicState, "SUPPRESSED");
    check("persistent_tombstone_survives_purge_before_after_import_and_republish_attempt");

    stage = "EAN_CHANGE_AND_PACKAGING_INDICATOR";
    const oldRow = sourceRow(), newRow = sourceRow();
    const changing = await product(oldRow.ean);
    await db.product.update({ where: { id: changing.id }, data: { ean: newRow.ean, eanNormalized: normalizeGtin(newRow.ean)! } });
    await db.product.delete({ where: { id: changing.id } });
    await apply(manifest([oldRow, newRow], admin.id, true));
    assert.equal((await identity(oldRow.ean)).publicState, "SUPPRESSED");
    assert.equal((await identity(newRow.ean)).publicState, "SUPPRESSED");
    const upc = withCheckDigit("90012345678");
    const equivalent = sourceRow("0" + upc);
    const packageRow = sourceRow(withCheckDigit("1" + equivalent.ean.slice(0, -1)));
    await product(upc);
    await apply(manifest([equivalent, packageRow], admin.id, true));
    assert.equal((await identity(equivalent.ean)).publicState, "SUPPRESSED");
    assert.equal((await identity(packageRow.ean)).publicState, "PUBLIC");
    assert.notEqual(normalizeGtin(packageRow.ean), normalizeGtin(upc));
    check("ean_changes_reserve_old_new_and_upc_aliases_do_not_truncate_packaging_indicator");

    stage = "PUBLIC_REVIEW_SOURCE_CHANGES_AND_HISTORICAL_SNAPSHOT";
    const reviewedRow = sourceRow();
    await apply(manifest([reviewedRow], admin.id, true));
    const dto = publicCatalogIdentity(await identity(reviewedRow.ean));
    assert.ok(dto);
    assert.deepEqual(Object.keys(dto).sort(), ["kind", "id", "gtinCanonical", "ean", "name", "categoryName", "categorySlug", "href"].sort());
    assert.equal(JSON.stringify(dto).includes("privatePfCents"), false);
    await db.catalogIdentity.update({ where: { gtinCanonical: normalizeGtin(reviewedRow.ean)! }, data: { name: "Synthetic changed identity without new review" } });
    assert.equal((await identity(reviewedRow.ean)).publicState, "PRIVATE", "Direct presentation update cannot inherit a review.");
    await apply(manifest([reviewedRow], admin.id, true));
    assert.equal((await identity(reviewedRow.ean)).publicState, "PUBLIC", "Explicit re-review must publish the restored original identity even when its identity hash equals the stored hash.");
    const changedRow = { ...reviewedRow, sourceRecord: { ...reviewedRow.sourceRecord, laboratory: "Changed synthetic laboratory" } };
    await apply(manifest([changedRow], admin.id));
    assert.equal((await identity(changedRow.ean)).publicState, "PRIVATE");
    await assert.rejects(db.catalogIdentity.update({ where: { gtinCanonical: normalizeGtin(changedRow.ean)! }, data: { publicState: "PUBLIC" } }), "Unreviewed source cannot be made public.");
    await apply(manifest([changedRow], admin.id, true));
    assert.equal((await identity(changedRow.ean)).publicState, "PUBLIC");
    const historical = sourceRow();
    const historicalManifest = manifest([historical], admin.id, true);
    historicalManifest.suppressionSnapshot = { sourceFileSha256: "c".repeat(64), observedAt: scenarioTime.toISOString(), gtins: [normalizeGtin(historical.ean)!] };
    await apply(historicalManifest);
    await apply(manifest([historical], admin.id, true));
    assert.equal((await identity(historical.ean)).publicState, "SUPPRESSED");
    check("review_evidence_exact_source_hash_private_dto_and_pinned_historical_suppression");

    stage = "ADMIN_STALE_PLAN_IDEMPOTENCY_AND_BATCH_501";
    const serviceRow = sourceRow(), input = manifest([serviceRow], admin.id);
    const beforeUnauthorized = await db.catalogIdentity.count();
    await assert.rejects(run(input, {}, staff.id), /Active ADMIN/);
    await db.user.update({ where: { id: admin.id }, data: { isActive: false } });
    await assert.rejects(run(input), /Active ADMIN/);
    await db.user.update({ where: { id: admin.id }, data: { isActive: true } });
    assert.equal(await db.catalogIdentity.count(), beforeUnauthorized);
    await assert.rejects(run(input, { apply: true, expectedPlanSha256: "f".repeat(64) }), /fresh dry-run/);
    await apply(input);
    const stalePlan = await run(input);
    const current = await identity(serviceRow.ean);
    await db.catalogIdentity.update({ where: { gtinCanonical: current.gtinCanonical }, data: { updatedAt: new Date(current.updatedAt.getTime() + 1000) } });
    await assert.rejects(run(input, { apply: true, expectedPlanSha256: stalePlan.planSha256 }), /fresh dry-run/);
    const auditCount = await db.auditLog.count();
    const repeated = await apply(input);
    assert.equal(repeated.counts.unchanged, 1);
    assert.equal(await db.auditLog.count(), auditCount, "Idempotent import must add no audit rows.");
    const batchRows = Array.from({ length: 501 }, () => sourceRow());
    const beforeBatch = await commerceSnapshot();
    const batchResult = await apply(manifest(batchRows, admin.id));
    assert.equal(batchResult.counts.create, 501);
    assert.equal(batchResult.counts.private, 501);
    assert.equal(await commerceSnapshot(), beforeBatch);
    check("live_admin_stale_revision_plan_idempotency_batch_501_and_commerce_preservation");

    stage = "TWO_TRANSACTION_CATALOG_LOCK_RACE";
    const raceRow = sourceRow(), raceInput = manifest([raceRow], admin.id, true);
    const acquired = deferred(), release = deferred(), waiterStarted = deferred();
    let waiterPid = 0;
    const writer = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(87164322)::text`;
      await tx.product.create({ data: { name: "Synthetic race product", slug: `catalog-race-${target.nonce}`, ean: raceRow.ean, price: 10, stock: 1, status: "DRAFT" } });
      acquired.resolve();
      await deadline(release.promise, 10000, "Race writer release deadline exceeded.");
    }, { maxWait: 5000, timeout: 15000 });
    // Attach a rejection observer before awaiting the signal, so setup failures cannot leak promises.
    const writerObserved = writer.then(() => ({ ok: true as const }), error => ({ ok: false as const, error }));
    let waiter: Promise<Awaited<ReturnType<typeof executeCatalogIdentityImport>>> | undefined;
    try {
      await deadline(Promise.race([acquired.promise, writerObserved.then(result => { if (!result.ok) throw result.error; })]), 7000, "Race writer never acquired the catalog lock.");
      waiter = db.$transaction(async tx => {
        waiterPid = (await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0].pid;
        waiterStarted.resolve();
        const dryRun = await executeCatalogIdentityImport(tx, raceInput, admin.id, { now: scenarioTime });
        return executeCatalogIdentityImport(tx, raceInput, admin.id, { now: scenarioTime, apply: true, expectedPlanSha256: dryRun.planSha256 });
      }, { maxWait: 5000, timeout: 15000 });
      const waiterObserved = waiter.then(() => ({ ok: true as const }), error => ({ ok: false as const, error }));
      await deadline(Promise.race([waiterStarted.promise, waiterObserved.then(result => { if (!result.ok) throw result.error; })]), 5000, "Race waiter did not start.");
      let waiting = false;
      const expires = Date.now() + 2000;
      while (Date.now() < expires && !waiting) {
        const locks = await db.$queryRaw<{ waiting: boolean }[]>`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE pid = ${waiterPid} AND locktype = 'advisory' AND NOT granted) AS waiting`;
        waiting = locks[0].waiting;
        if (!waiting) await new Promise(done => setTimeout(done, 25));
      }
      assert.equal(waiting, true, "The import must wait behind the existing catalog mutation lock.");
      release.resolve();
      await writer;
      const result = await waiter;
      assert.equal(result.counts.suppressed, 1);
      assert.equal((await identity(raceRow.ean)).publicState, "SUPPRESSED");
    } finally {
      release.resolve();
      await Promise.allSettled([writer, ...(waiter ? [waiter] : [])]);
    }
    check("two_transaction_product_writer_import_waiter_serialized_with_bounded_timeouts");

    stage = "FINAL_RECEIPT";
    assert.equal(await db.customer.count(), 0);
    assert.equal(await db.order.count(), 0);
    assert.equal(await db.supplierCatalogOffer.count(), 0);
    console.log(JSON.stringify({ ok: true, syntheticOnly: true, database: target.database, host: target.host, nonce: target.nonce,
      checksPassed: checks.length, checks, fixturesRetained: true, cleanup: "Operator drops only the exact isolated QA database.",
      identities: await db.catalogIdentity.count(), tombstones: await db.catalogIdentitySuppression.count(),
      products: await db.product.count(), offers: await db.offer.count(),
      legacyPurgeCoverage: "Only explicit historical GTIN evidence is covered; synthetic QA cannot prove absent legacy EANs." }, null, 2));
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const redact = (message: string) => message.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[REDACTED_DATABASE_URL]");
  console.error(JSON.stringify({ ok: false, syntheticOnly: true, stage, checksPassed: checks.length, checks,
    error: redact(error instanceof Error ? error.message : String(error)),
    code: error && typeof error === "object" && "code" in error ? String(error.code) : null }));
  process.exitCode = 1;
});
