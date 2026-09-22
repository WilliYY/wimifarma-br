import assert from "node:assert/strict";
import test from "node:test";
import { createMerchantFeedStream } from "./merchant-feed";
import { merchantIssues } from "./marketing";

const product = { id: "fixture", slug: "chocolate-fixture", name: "Chocolate & wafer", brand: "Marca teste", category: "Chocolates", description: "Chocolate ao leite em embalagem individual de 41,5 g. Produto fictício somente para testar o catálogo.", ean: "7891000248768", imageUrl: "/uploads/products/fixture.webp", price: "10.90", promotionalPrice: null, stock: 1, status: "ACTIVE", requiresPrescription: false, isPopularPharmacy: false, activeIngredients: [] as string[], imageAsset: { width: 800, height: 800, originalName: "foto-real-front.webp" } };

test("automatic feed includes future pages even after a full page of ineligible products", { timeout: 5000 }, async () => {
  const queries: Array<{ where: unknown; take: number }> = [];
  const batches = [Array.from({ length: 500 }, (_, index) => ({ ...product, id: String(index).padStart(4, "0"), requiresPrescription: true })), [{ ...product, id: "0500" }]];
  const db = { product: { findMany: async (query: { where: unknown; take: number }) => { queries.push(query); return batches.shift() ?? []; } } };
  const xml = await new Response(await createMerchantFeedStream(db as never)).text();
  assert.equal((xml.match(/<item>/g) ?? []).length, 1);
  assert.match(xml, /Chocolate &amp; wafer/);
  assert.ok(xml.endsWith("</channel></rss>"));
  assert.deepEqual(queries.map(query => query.where), [{ status: "ACTIVE", deletedAt: null }, { status: "ACTIVE", deletedAt: null, id: { gt: "0499" } }]);
  assert.ok(queries.every(query => query.take === 500));
});

test("empty catalog is valid XML and database failure cannot appear as a successful empty feed", async () => {
  const empty = { product: { findMany: async () => [] } };
  assert.match(await new Response(await createMerchantFeedStream(empty as never)).text(), /<channel>[\s\S]*<\/channel><\/rss>$/);
  await assert.rejects(() => createMerchantFeedStream({ product: { findMany: async () => { throw new Error("offline"); } } } as never));
  let page = 0;
  const stream = await createMerchantFeedStream({ product: { findMany: async () => { if (page++) throw new Error("private database error"); return Array.from({ length: 500 }, () => product); } } } as never);
  await assert.rejects(() => new Response(stream).text(), /Catálogo temporariamente indisponível/);
});

test("cosmetic ingredients do not exclude hygiene products, while medicinal signals stay excluded", () => {
  const cosmetic = { ...product, name: "Óleo de banho Dove", category: "Higiene pessoal", activeIngredients: ["Glicerina", "Agentes condicionantes"] };
  assert.deepEqual(merchantIssues(cosmetic), []);
  assert.ok(merchantIssues({ ...cosmetic, activeIngredients: ["dipirona"] }).some(issue => issue.includes("regulado")));
  assert.ok(merchantIssues({ ...product, activeIngredients: ["ingrediente a confirmar"] }).some(issue => issue.includes("regulado")));
});
