import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { cmedImportManifestSchema, executeCmedImport, type CmedImportTransaction } from "../src/features/products/cmed-import";
import { lockProductCatalog } from "../src/features/products/mutations";

const QA_URL = "postgresql://qa:synthetic-qa-only@wimifarma-br-cmed-qa:5432/cmed_qa";
const scenarioTime = new Date("2026-10-22T10:00:00.000Z");
const referenceNow = Date.parse("2026-10-23T12:00:00.000Z");
const adminId = "cmed-qa-admin";
const staffId = "cmed-qa-staff";
const productIds = ["cmed-qa-a", "cmed-qa-b"];
const eans = ["7896004724577", "7896004724584"];

function reference(index: number) {
  return {
    version: 1 as const, eanNormalized: eans[index].padStart(14, "0"), product: `Medicamento sintético ${index}`,
    presentation: "10 MG CT 30 COM", laboratory: "Laboratório sintético QA", registration: "1234567890123",
    sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file",
    sourceSha256: "5febea16f9d08f2dbdcf15e954a05b762a7650e834d050c4d57b2dcb4b448fa3",
    publishedOn: "2026-10-09", observedAt: "2026-10-22T12:00:00.000Z", rates: [{ label: "PMC 20%", cents: 2500 }],
  };
}

function transactionAdapter(tx: Prisma.TransactionClient, failAudit = false): CmedImportTransaction {
  let auditWrites = 0;
  return {
    lockCatalog: () => lockProductCatalog(tx),
    $queryRaw: (strings, ...values) => tx.$queryRaw(strings, ...values),
    user: { findFirst: input => tx.user.findFirst(input) },
    product: { findUnique: input => tx.product.findUnique(input), update: input => tx.product.update(input) },
    auditLog: { create: input => tx.auditLog.create(failAudit && ++auditWrites === 2
      ? { data: { ...input.data, userId: "cmed-qa-nonexistent-user" } } : input) },
  };
}

async function main() {
  // Validate both values before constructing any database client or pool. Do not load dotenv.
  if (process.env.CMED_QA !== "isolated-disposable" || process.env.CMED_QA_DATABASE_URL !== QA_URL) {
    throw new Error("CMED QA requires CMED_QA=isolated-disposable and the exact disposable CMED_QA_DATABASE_URL.");
  }
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("Network fetch is forbidden in CMED transaction QA."); };
  const pool = new Pool({ connectionString: QA_URL, max: 4, connectionTimeoutMillis: 5000 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const passed: string[] = [];
  const snapshot = async () => ({
    products: await db.product.findMany({ orderBy: { id: "asc" } }),
    offers: await db.supplierCatalogOffer.findMany({ orderBy: { id: "asc" } }),
    audits: await db.auditLog.findMany({ orderBy: { id: "asc" } }),
    users: await db.user.findMany({ orderBy: { id: "asc" } }),
  });
  const manifest = async (ids = productIds) => cmedImportManifestSchema.parse({ version: 1, products: await Promise.all(ids.map(async id => {
    const product = await db.product.findUniqueOrThrow({ where: { id } });
    return { productId: id, expectedUpdatedAt: product.updatedAt.toISOString(), expectedName: product.name,
      expectedBrand: product.brand, cmedReference: reference(productIds.indexOf(id)) };
  })) });
  const run = (input: ReturnType<typeof cmedImportManifestSchema.parse>, apply: boolean, actorId = adminId, failAudit = false) =>
    db.$transaction(tx => executeCmedImport(transactionAdapter(tx, failAudit), input, actorId, apply, referenceNow), { timeout: 20_000, maxWait: 20_000 });
  try {
    const identity = await db.$queryRaw<Array<{ database: string; version: number }>>`SELECT current_database() AS database, current_setting('server_version_num')::int AS version`;
    assert.equal(identity[0]?.database, "cmed_qa");
    assert.ok(identity[0].version >= 170000 && identity[0].version < 180000, "Disposable QA requires PostgreSQL 17.");
    const tables = await db.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename`;
    assert.ok(tables.length > 0, "Migrate the disposable QA database before running the audit.");
    for (const { tablename } of tables) {
      // Table identifiers come only from PostgreSQL's public catalog and are quoted as identifiers.
      const count = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*) AS count FROM public."${tablename.replaceAll('"', '""')}"`);
      assert.equal(count[0].count, BigInt(0), "Disposable QA requires every application table to be empty.");
    }
    await db.$transaction(async tx => {
      for (const [id, role] of [[adminId, "ADMIN"], [staffId, "STAFF"]] as const) {
        await tx.user.create({ data: { id, role, name: "Usuário sintético CMED QA", email: `${id}@example.invalid`, passwordHash: "synthetic-non-login-hash", isActive: true } });
      }
      for (let index = 0; index < productIds.length; index++) {
        await tx.product.create({ data: {
          id: productIds[index], slug: productIds[index], name: `Medicamento sintético ${index} 10 mg`, brand: "Marca sintética QA",
          ean: eans[index], eanNormalized: eans[index].padStart(14, "0"), status: "ACTIVE", inventorySource: "DISTRIBUTOR",
          catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: true },
          price: "17.31", promotionalPrice: "16.47", stock: 7, supplierMarkupBps: 4317, cashbackEnabled: true,
          cashbackRateBps: 123, wimicoinsEnabled: true, wimicoinsRateBps: 217,
          imageUrl: "/synthetic-cmed-qa.webp", imageUrls: ["/synthetic-cmed-qa-detail.webp"],
          shippingProfile: { synthetic: true, weightGrams: 87 }, createdAt: scenarioTime, updatedAt: scenarioTime,
        } });
        await tx.supplierCatalogOffer.create({ data: {
          id: `cmed-qa-offer-${index}`, productId: productIds[index], supplier: "ANB", externalCode: `synthetic-${index}`,
          eanNormalized: eans[index].padStart(14, "0"), unitCostCents: 1113, substitutionTaxCents: 37, retailCeilingCents: 2500,
          available: true, stockQuantity: 19, allocationQuantity: 13, reservedQuantity: 2, committedQuantity: 3,
          revision: 7, observedAt: scenarioTime, validUntil: new Date("2026-10-24T12:00:00.000Z"),
          sourceUrl: "https://example.invalid/synthetic-cmed-qa", createdAt: scenarioTime, updatedAt: scenarioTime,
        } });
      }
    });

    const initial = await snapshot();
    const initialManifest = await manifest();
    await run(initialManifest, false);
    assert.deepEqual(await snapshot(), initial);
    passed.push("dry-run sem gravação ou auditoria");

    await run(initialManifest, true);
    const applied = await snapshot();
    const commercialFields = (product: (typeof applied.products)[number]) => {
      const { cmedReference: _reference, updatedAt: _updatedAt, ...fields } = product;
      void [_reference, _updatedAt]; return fields;
    };
    assert.deepEqual(applied.products.map(commercialFields), initial.products.map(commercialFields));
    assert.deepEqual(applied.offers, initial.offers);
    assert.deepEqual(applied.users, initial.users);
    assert.equal(applied.audits.length, 2);
    for (let index = 0; index < productIds.length; index++) {
      assert.deepEqual(applied.products[index].cmedReference, reference(index));
      assert.notEqual(applied.products[index].updatedAt.toISOString(), scenarioTime.toISOString());
      const audits = applied.audits.filter(audit => audit.entityId === productIds[index]);
      assert.equal(audits.length, 1); assert.equal(audits[0].userId, adminId); assert.equal(audits[0].action, "CMED_REFERENCE_IMPORTED");
    }
    passed.push("apply exclusivo de cmedReference/updatedAt, auditoria por produto e ofertas preservadas");

    const badRevision = await manifest();
    badRevision.products[1].expectedUpdatedAt = scenarioTime.toISOString();
    const beforeRevision = await snapshot();
    await assert.rejects(run(badRevision, true), /identity or revision mismatch/);
    assert.deepEqual(await snapshot(), beforeRevision);
    passed.push("revisão divergente bloqueia lote inteiro");

    // Give the concurrency fixture a known older revision so the winning update changes it.
    await db.product.update({ where: { id: productIds[0] }, data: { updatedAt: scenarioTime } });
    const concurrentManifest = await manifest([productIds[0]]);
    const beforeConcurrent = await snapshot();
    const concurrent = await Promise.allSettled([run(concurrentManifest, true), run(concurrentManifest, true)]);
    assert.equal(concurrent.filter(result => result.status === "fulfilled").length, 1);
    const loser = concurrent.find(result => result.status === "rejected");
    assert.ok(loser?.status === "rejected");
    assert.match(String(loser.reason), /identity or revision mismatch/);
    const afterConcurrent = await snapshot();
    assert.equal(afterConcurrent.audits.length, beforeConcurrent.audits.length + 1);
    assert.deepEqual(afterConcurrent.products.map(commercialFields), beforeConcurrent.products.map(commercialFields));
    assert.deepEqual(afterConcurrent.offers, beforeConcurrent.offers);
    passed.push("concorrência com mesma revisão permite exatamente um vencedor");

    const beforeDenied = await snapshot();
    await assert.rejects(run(await manifest(), true, staffId), /Active ADMIN actor required/);
    const wrongEan = await manifest();
    wrongEan.products[0].cmedReference.eanNormalized = "00000000000000";
    await assert.rejects(run(wrongEan, true), /Invalid CMED reference, GTIN or official source edition/);
    assert.deepEqual(await snapshot(), beforeDenied);
    passed.push("ator sem permissão e EAN divergente bloqueados");

    const beforeAuditFailure = await snapshot();
    // Fail the second audit after one product/audit pair succeeds within the same transaction.
    const failingManifest = await manifest();
    for (const row of failingManifest.products) row.cmedReference.observedAt = "2026-10-23T11:00:00.000Z";
    await assert.rejects(run(failingManifest, true, adminId, true), error =>
      typeof error === "object" && error !== null && "code" in error && error.code === "P2003");
    assert.deepEqual(await snapshot(), beforeAuditFailure);
    passed.push("falha real de FK da auditoria reverte integralmente JSON e revisão");
    assert.equal(fetchCalls, 0);
    console.log(JSON.stringify({ passed: true, database: "cmed_qa", postgresqlMajor: 17, scenarios: passed, fetchCalls, productionAccess: false }, null, 2));
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "CMED transaction QA failed"); process.exitCode = 1; });
