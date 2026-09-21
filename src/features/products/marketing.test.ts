import assert from "node:assert/strict";
import test from "node:test";
import { buildMerchantFeed, campaignUrl, merchantIssues, type MarketingProduct } from "./marketing";
import { presentationNumbers } from "./ai-suggestions";
import { productTypeHint } from "./product-types";
import { buildProductStructuredData, buildProductMetaDescription } from "./product-detail";
import { categorySlug, siteStructuredData } from "@/lib/seo";

const product: MarketingProduct = { id: "fixture", slug: "chocolate-fixture", name: "Chocolate & wafer <teste>", brand: "Marca teste", category: "Chocolates", description: "Chocolate ao leite em embalagem individual de 41,5 g. Produto ficticio usado somente em teste isolado do feed.", ean: "7891000248768", imageUrl: "/uploads/products/fixture.webp", price: "10.90", promotionalPrice: "9.99", stock: 1, status: "ACTIVE", requiresPrescription: false, isPopularPharmacy: false, activeIngredients: [], imageAsset: { width: 800, height: 800, originalName: "foto-real-front.webp" } };
test("feed contem preco real, desconto, GTIN e XML seguro com identificacao de texto assistido", () => {
  const feed = buildMerchantFeed([product]);
  assert.equal(feed.count, 1);
  assert.match(feed.xml, /Chocolate &amp; wafer &lt;teste&gt;/);
  assert.match(feed.xml, /<g:price>10.90 BRL<\/g:price>/);
  assert.match(feed.xml, /<g:sale_price>9.99 BRL/);
  assert.match(feed.xml, /trained_algorithmic_media/);
  assert.doesNotMatch(feed.xml, /<g:identifier_exists>no/);
});
test("feed exclui rascunhos, regulados, GTIN invalido, arte e imagem insuficiente", () => {
  for (const override of [{ status: "DRAFT" }, { requiresPrescription: true }, { isPopularPharmacy: true }, { category: "Medicamentos" }, { category: "Suplementos" }, { category: "Nutrição infantil" }, { activeIngredients: ["dipirona"] }, { ean: "1234567890123" }, { imageAsset: null }, { imageAsset: { width: 400, height: 400, originalName: "photo.webp" } }, { imageAsset: { width: 1000, height: 1000, originalName: "arte-ilustrativa-other.webp" } }]) {
    assert.ok(merchantIssues({ ...product, ...override }).length > 0);
    assert.equal(buildMerchantFeed([{ ...product, ...override }]).count, 0);
  }
  assert.match(buildMerchantFeed([{ ...product, stock: 0 }]).xml, /out_of_stock/);
});
test("links de campanha sao codificados e nao mudam o caminho canonico", () => {
  const url = new URL(campaignUrl("produto-teste", "instagram", 'Verão & inverno #1'));
  assert.equal(url.pathname, "/produto/produto-teste");
  assert.equal(url.searchParams.get("utm_campaign"), 'Verão & inverno #1');
  assert.equal(url.searchParams.get("utm_source"), "instagram");
});
test("classificacao cobre categorias novas sem transformar vitaminas em doces", () => {
  assert.equal(productTypeHint("Vitamina em gomas"), "supplement");
  assert.equal(productTypeHint("Proteção solar"), "beauty");
  assert.equal(productTypeHint("Cuidados com os cabelos"), "hygiene");
  assert.equal(productTypeHint("Chocolates"), "food");
});
test("identidade compara unidades equivalentes sem misturar dose e quantidade", () => {
  assert.deepEqual(presentationNumbers("Produto 1 g 20 comprimidos"), presentationNumbers("Produto 1000 mg 20 comprimidos"));
  assert.deepEqual(presentationNumbers("Frasco 0,5 L"), presentationNumbers("Frasco 500 ml"));
  assert.notDeepEqual(presentationNumbers("Produto 20 mg"), presentationNumbers("Produto 20 g"));
});
test("SEO preserva descricao completa, omite GTIN invalido e limita resumo", () => {
  const structured = buildProductStructuredData({ ...product, price: 9.99, sku: null, rating: { count: 0, average: null }, ean: "1234567890123" });
  assert.equal(structured.gtin13, undefined);
  assert.equal(structured.description, product.description);
  assert.ok(buildProductMetaDescription({ name: "N".repeat(160), brand: null, description: null }).length <= 160);
  assert.equal(categorySlug("Higiene & Beleza"), "higiene-beleza");
  assert.equal(siteStructuredData()["@graph"][0]["@type"], "Pharmacy");
});
