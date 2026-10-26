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
    "@/components/site/product-purchase-panel": "import React from 'react';export const ProductPurchasePanel=()=>React.createElement('div',{'data-purchase-panel':true});",
    "@/components/site/product-quantity": "export const ProductQuantityProvider=p=>p.children;",
    "@/components/site/product-share-button": "export const ProductShareButton=()=>null;",
    "@/components/site/product-payment-methods": "export const ProductPaymentMethods=()=>null;",
    "@/components/site/product-cashback": "export const ProductCashback=()=>null;",
    "@/components/site/delivery-estimator": "import React from 'react';export const DeliveryEstimator=()=>React.createElement('div',{'data-delivery':true});",
    "@/components/site/product-review-form": "import React from 'react';export const ProductReviewForm=()=>React.createElement('div',{'data-review-form':true});",
    "@/components/site/related-products-carousel": "import React from 'react';export const RelatedProductsCarousel=()=>React.createElement('div',{'data-related-cards':true});",
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
    id: "synthetic-product", slug: "synthetic-product", name: "Produto sintético", brand: "Marca sintética",
    category: "Higiene", description: "Descrição sintética para a apresentação.", ean: null, sku: null,
    price: "10.00", promotionalPrice: null, stock: 5, activeIngredients: [], searchTerms: [],
    imageUrl: null, imageUrls: [], requiresPrescription: false, prescriptionType: "UNREVIEWED",
    inventorySource: "PHARMACY", isPopularPharmacy: false, pmcReference: null, cashbackEnabled: false,
  };
  const fixture = {
    authCalls: 0, reviewReads: 0,
    db: {
      product: { findFirst: async () => product, findMany: async () => [{ ...product, id: "related", slug: "related", name: "Correlato sintético" }] },
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
});
