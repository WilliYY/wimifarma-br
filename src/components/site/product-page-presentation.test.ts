import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { build } from "esbuild";

test("product page keeps product, related cards and details without public reviews or support strips", async () => {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default p=>React.createElement('a',{href:p.href},p.children);",
    "next/navigation": "export function notFound(){throw new Error('Unexpected notFound')}",
    "@/lib/prisma": "export const getPrisma=()=>fixture.db;",
    "@/features/auth/auth": "export const auth=async()=>{fixture.authCalls++;return null;};",
    "@/features/supplier-catalog/commerce": "export const supplierOfferInclude={};export const toSaleProduct=p=>p;",
    "@/components/site/product-image-viewer": "import React from 'react';export const ProductImageViewer=()=>React.createElement('div',{'data-gallery':true});",
    "@/components/site/product-purchase-panel": "import React from 'react';export const ProductPurchasePanel=p=>React.createElement('div',{'data-purchase-panel':true,'data-cart-name':p.product.name});",
    "@/components/site/product-quantity": "export const ProductQuantityProvider=p=>p.children;",
    "@/components/site/product-share-button": "export const ProductShareButton=()=>null;",
    "@/components/site/product-payment-methods": "export const ProductPaymentMethods=()=>null;",
    "@/components/site/product-cashback": "export const ProductCashback=()=>null;",
    "@/components/site/delivery-estimator": "import React from 'react';export const DeliveryEstimator=()=>React.createElement('div',{'data-delivery':true});",
    "@/components/site/product-review-form": "import React from 'react';export const ProductReviewForm=()=>React.createElement('div',{'data-review-form':true});",
    "@/components/site/related-products-carousel": "import React from 'react';export const RelatedProductsCarousel=p=>React.createElement('div',{'data-related-cards':true},p.products.map(x=>React.createElement('span',{key:x.id},x.name)));",
  };
  const bundle = await build({
    entryPoints: ["src/app/(site)/produto/[slug]/page.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "product-page-presentation", setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", external: true }));
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx" }));
    } }],
  });
  const product = {
    id: "synthetic-product", slug: "synthetic-product", name: "Produto sintético 10mg 20 comprimidos", brand: "Marca sintética",
    category: "Higiene", description: "Descrição sintética para a apresentação.", ean: null, sku: null,
    price: "10.00", promotionalPrice: null, stock: 5, activeIngredients: ["Ingrediente sintético"], searchTerms: [],
    imageUrl: null, imageUrls: [], requiresPrescription: false, prescriptionType: "UNREVIEWED",
    inventorySource: "PHARMACY", isPopularPharmacy: false, cashbackEnabled: false,
    catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: true },
    pmcReference: {
      amountCents: 2000, column: "PMC 0 %", publishedOn: "2026-11-01",
      sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/synthetic.xlsx/@@download/file",
      presentation: "Apresentação sintética", laboratory: "Laboratório sintético", registration: "sintético",
      rates: [{ label: "PMC 0 %", cents: 2000 }],
    },
  };
  const fixture = {
    authCalls: 0, reviewReads: 0,
    db: {
      product: { findFirst: async () => product, findMany: async () => [{ ...product, id: "related", slug: "related", name: "Produto sintético 10mg 60 comprimidos" }] },
      productReview: { findMany: async () => { fixture.reviewReads++; return []; } },
    },
  };
  const loaded = { exports: {} as { default(props: { params: Promise<{ slug: string }> }): Promise<ReactElement> } };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, URL,
  });
  const html = renderToStaticMarkup(await loaded.exports.default({ params: Promise.resolve({ slug: product.slug }) }));
  assert.equal(fixture.authCalls, 0, "public presentation does not need customer review authentication");
  assert.equal(fixture.reviewReads, 0, "hidden reviews must not add database queries");
  assert.doesNotMatch(html, /id="avaliacoes"|#avaliacoes|data-review-form|Sem avaliações|Opinioes de clientes/);
  assert.doesNotMatch(html, /Cuidado de perto|Retirada gratuita|Pedido acompanhado|Duvidas pelo WhatsApp/);
  assert.doesNotMatch(html, /Sobre o PMC e a comparação de preços|Pedido confirmado pela equipe|O pagamento é combinado no atendimento/);
  assert.match(html, /50% OFF/);
  assert.match(html, /<s>R\$\s*20,00<\/s>/);
  for (const marker of ["data-gallery", "data-purchase-panel", "data-delivery", "data-related-cards", 'id="informacoes"']) assert.ok(html.includes(marker), marker);
  assert.ok(html.indexOf("data-purchase-panel") < html.indexOf('id="relacionados"'));
  assert.ok(html.indexOf('id="relacionados"') < html.indexOf("Explore este produto"));
  assert.ok(html.indexOf("Explore este produto") < html.indexOf('id="informacoes"'));
  const script = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(script);
  const data = JSON.parse(script[1]);
  const productData = data.find((item: { "@type": string }) => item["@type"] === "Product");
  assert.ok(productData);
  assert.equal(Object.hasOwn(productData, "aggregateRating"), false, "no hidden rating in product metadata");

  Object.assign(product, { name: "Sabonete Rexona Multivitaminas 84g", brand: "Rexona", category: "Higiene pessoal", activeIngredients: [], inventorySource: "DISTRIBUTOR", catalogClassification: { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false }, pmcReference: null });
  const queryCalls: unknown[] = [];
  const kit = { ...product, id: "rexona-kit-six", slug: "rexona-kit-six", name: "Kit sabonete Rexona Multivitaminas 6x84g" };
  fixture.db.product.findMany = async (...args: unknown[]) => {
    queryCalls.push(args[0]);
    return [kit, { ...product, id: "conditioner", slug: "conditioner", name: "Condicionador cabelos 200mL", brand: "Outra marca" }];
  };
  const soapHtml = renderToStaticMarkup(await loaded.exports.default({ params: Promise.resolve({ slug: product.slug }) }));
  assert.match(soapHtml, /Kit sabonete Rexona Multivitaminas 6x84g/);
  assert.doesNotMatch(soapHtml, /Condicionador cabelos|Leia a embalagem e a bula|Correlato não significa substituto/);
  assert.match(soapHtml, /Conteúdo da embalagem/);
  assert.match(soapHtml, /84 g/);
  assert.match(soapHtml, /Cuidados com o produto/);
  assert.match(soapHtml, /Identificação do produto/);
  assert.match(soapHtml, /data-product-purchase-conditions/);
  assert.match(soapHtml, /Preparação prevista até/);
  assert.match(soapHtml, /Pix com 3% de desconto ao selecionar no checkout/);
  assert.ok(soapHtml.indexOf("data-purchase-panel") < soapHtml.indexOf("data-product-purchase-conditions"));
  assert.equal(queryCalls.length, 2, "same-line candidates are retrieved independently of the general candidate limit");
  assert.match(JSON.stringify(queryCalls[0]), /"AND".*sabonete.*Rexona/);
  for (const [name, presentation, content] of [
    ["Sabonete Protex BALANCE SAUDAVEL85gL6P5", "1 pacote com 6 barras", "6 barras de 85 g · 510 g líquidos"],
    ["Esmalte Colorama Gabriele caixa com 6 frascos de 8 ml", "1 caixa com 6 frascos", "6 frascos de 8 mL · 48 mL no total"],
    ["Absorvente Intimus Leve8Pague7", "1 pacote com 8 absorventes", "8 absorventes"],
  ]) {
    Object.assign(product, { name });
    const packHtml = renderToStaticMarkup(await loaded.exports.default({ params: Promise.resolve({ slug: product.slug }) }));
    assert.ok(packHtml.includes(presentation), presentation);
    assert.ok(packHtml.includes(content), content);
    assert.ok(packHtml.includes(`por ${presentation}`), "price describes the complete commercial package");
  }
  Object.assign(product, { name: "Kit Actine One FPS 50 Sem Cor 40 g + Gel de Limpeza 40 g", brand: "Actine" });
  const actineHtml = renderToStaticMarkup(await loaded.exports.default({ params: Promise.resolve({ slug: product.slug }) }));
  assert.match(actineHtml, /Conteúdo da embalagem<\/dt><dd[^>]*>Actine One FPS 50 Sem Cor 40 g \+ Gel de Limpeza 40 g<\/dd>/);
  assert.match(actineHtml, /Apresentação<\/dt><dd[^>]*>1 kit<\/dd>/);
  assert.match(actineHtml, /por 1 kit/);

  Object.assign(product, { name: "Dipirona monoidratada 1 g 10 comprimidos Medley", category: "Medicamentos", activeIngredients: ["DIPIRONA MONOIDRATADA"] });
  const dipyroneHtml = renderToStaticMarkup(await loaded.exports.default({ params: Promise.resolve({ slug: product.slug }) }));
  assert.match(dipyroneHtml, /<h1[^>]*>Dipirona monoidratada 1 g 10 comprimidos Medley<\/h1>/);
  assert.match(dipyroneHtml, /Concentração<\/dt><dd[^>]*>1 g<\/dd>/);
  assert.match(dipyroneHtml, /Apresentação<\/dt><dd[^>]*>10 comprimidos<\/dd>/);
  assert.doesNotMatch(dipyroneHtml, /Conteúdo da embalagem/);

  Object.assign(product, { name: "Alenia 6 mcg + 200 mcg 60 cápsulas dura", activeIngredients: ["BUDESONIDA", "FUMARATO DE FORMOTEROL DIIDRATADO"], category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY" });
  const inhalationHtml = renderToStaticMarkup(await loaded.exports.default({ params: Promise.resolve({ slug: product.slug }) }));
  const medicineQuery = JSON.stringify(queryCalls.at(-1));
  assert.match(medicineQuery, /"AND".*budesonida.*fumarato de formoterol diidratado/);
  assert.doesNotMatch(medicineQuery, /"category"\s*:\s*\{/);
  assert.match(inhalationHtml, /data-cart-name="Alenia 6 mcg \+ 200 mcg 60 cápsulas dura · pó para inalação"/);
  assert.match(inhalationHtml, /<h1[^>]*>Alenia 6 mcg \+ 200 mcg 60 cápsulas dura · pó para inalação<\/h1>/);
  assert.match(inhalationHtml, /Fumarato de formoterol di-hidratado 6 mcg \+ Budesonida 200 mcg/);
  assert.doesNotMatch(inhalationHtml, /com inalador|refil/iu);
  Object.assign(product, { name: "Dorilax DT 450 mg + 50 mg + 35 mg 12 comprimidos", activeIngredients: ["CITRATO DE ORFENADRINA", "CAFEÍNA ANIDRA", "PARACETAMOL"] });
  const dorilaxHtml = renderToStaticMarkup(await loaded.exports.default({ params: Promise.resolve({ slug: product.slug }) }));
  assert.match(dorilaxHtml, /Paracetamol 450 mg \+ Cafeína anidra 50 mg \+ Citrato de orfenadrina 35 mg/);
});
