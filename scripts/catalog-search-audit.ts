/** Read-only production smoke check. Never creates orders or changes products. */
import assert from "node:assert/strict";
import { Prisma } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";
import { getSearchCatalog, getSearchSidebar } from "../src/features/products/search-catalog";
import { productDosePatterns } from "../src/features/products/public-search";

async function main() {
  const prisma = getPrisma();
  const probes = ["losartana 50mg", "losartana 50 mg (corus)", "corus", "losartana + hidro", "produto-inexistente-synthetic", "%%%"];
  const results = [];
  for (const query of probes) {
    const result = await getSearchCatalog(query);
    if (query === "losartana 50mg") assert.ok(result.count >= 10, "Piloto de losartana não foi encontrado");
    if (query === "losartana 50 mg (corus)") assert.ok(result.products.some(product => /corus/i.test(product.name)));
    if (query === "corus") assert.ok(result.relatedProducts.length > 0, "Marcas relacionadas não foram encontradas");
    assert.ok(result.products.every(product => !(product.inventorySource === "DISTRIBUTOR" && product.requiresPrescription && product.imageUrl)));
    assert.ok(result.products.every(product => !("supplierOffers" in product)));
    const sidebar = await getSearchSidebar([...result.products, ...result.relatedProducts]);
    results.push({ query, count: result.count, related: result.relatedProducts.length, sidebar: sidebar.title, sidebarCount: sidebar.products.length });
  }
  for (const [dose, expected] of [["5mg", 1], ["2,5mg", 2]] as const) {
    const pattern = productDosePatterns(dose)[0];
    const matches = await prisma.$queryRaw<{ name: string }[]>(Prisma.sql`
      SELECT name FROM (VALUES ('Bisoprolol 5mg'), ('Bisoprolol 2,5mg'), ('Bisoprolol 2.5 mg'), ('Bisoprolol 12,5mg')) sample(name)
      WHERE name ~* ${pattern}`);
    assert.equal(matches.length, expected, `PostgreSQL confundiu a dose ${dose}`);
  }
  console.log(JSON.stringify({ readOnly: true, checkedAt: new Date().toISOString(), results, decimalDosePostgres: "passed" }));
  await prisma.$disconnect();
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falha na auditoria"); process.exitCode = 1; });
