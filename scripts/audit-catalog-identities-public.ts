/** Real SQL and public DTO smoke in the exact disposable synthetic QA database. */
import assert from "node:assert/strict";

async function main() {
  const [flag, nonce] = process.argv.slice(2);
  assert.equal(flag, "--nonce");
  assert.match(nonce ?? "", /^[a-f0-9]{16,32}$/);
  assert.equal(process.env.CATALOG_IDENTITIES_DB_QA, "synthetic-only");
  assert.equal(process.env.CATALOG_IDENTITIES_QA_NONCE, nonce);
  const url = new URL(process.env.CATALOG_IDENTITIES_QA_DATABASE_URL ?? "");
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.equal(url.pathname, `/qa_catalog_identities_${nonce}`);
  assert.ok(["localhost", "127.0.0.1", `wimifarma-catalog-identities-qa-${nonce}`].includes(url.hostname));
  assert.equal(url.search, "");
  assert.equal(url.hash, "");
  // Every connection opened by the real application reader is read-only.
  url.searchParams.set("options", "-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=1000");
  process.env.DATABASE_URL = url.href;
  const { getPrisma } = await import("../src/lib/prisma");
  const { getPublicCatalogIdentities, getPublicCatalogIdentityByGtin } = await import("../src/features/catalog-identities/public-query");
  const { getSearchCatalog } = await import("../src/features/products/search-catalog");
  const { getPublicStorefrontProducts } = await import("../src/features/products/storefront");
  const { GET } = await import("../src/app/api/produtos/busca/route");
  const db = getPrisma();
  try {
    const target = await db.$queryRaw<{ database: string; readOnly: string }[]>`SELECT current_database() AS database, current_setting('transaction_read_only') AS "readOnly"`;
    assert.equal(target[0].database, `qa_catalog_identities_${nonce}`);
    assert.equal(target[0].readOnly, "on");
    const identities = await getPublicCatalogIdentities();
    assert.ok(identities.length > 0, "The DB QA fixture must include a reviewed public identity.");
    const item = identities[0];
    const expectedKeys = ["kind", "id", "gtinCanonical", "ean", "name", "categoryName", "categorySlug", "href"].sort();
    for (const identity of identities) assert.deepEqual(Object.keys(identity).sort(), expectedKeys);
    const privateIdentity = await db.catalogIdentity.findFirst({ where: { publicState: "PRIVATE" }, select: { ean: true } });
    assert.ok(privateIdentity);
    assert.equal(await getPublicCatalogIdentityByGtin(privateIdentity.ean), null);
    assert.equal((await getPublicCatalogIdentityByGtin(item.ean))?.id, item.id);
    const result = await getSearchCatalog(item.ean, { relatedLimit: 0 });
    assert.equal(result.products[0]?.id, item.id);
    assert.equal(result.relatedProducts.length, 0);
    const browse = await getPublicStorefrontProducts({ query: item.ean });
    assert.ok(browse.products.some(row => row.id === item.id));
    const response = await GET(new Request(`http://qa.invalid/api/produtos/busca?q=${item.ean}`));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.products[0].id, item.id);
    assert.deepEqual(Object.keys(body.data.products[0]).sort(), expectedKeys);
    assert.doesNotMatch(JSON.stringify(body), /privatePfCents|sourceRecord|sourceFileSha256|supplierOffers|unitCostCents|"price"|"stock"/);
    console.log(JSON.stringify({ ok: true, syntheticOnly: true, readOnly: true, nonce, publicIdentities: identities.length,
      checks: ["real_public_sql", "private_detail_denied", "exact_ean_search", "mixed_storefront", "actual_search_api_allowlist"] }));
  } finally {
    await db.$disconnect();
    const pool = (globalThis as unknown as { prismaPool?: { end(): Promise<void> } }).prismaPool;
    await pool?.end();
  }
}
main().catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[REDACTED_DATABASE_URL]")); process.exitCode = 1; });
