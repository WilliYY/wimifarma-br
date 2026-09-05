import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProductMetaDescription,
  buildProductStructuredData,
  getDeliveryAvailability,
  productReviewInputSchema,
  publicReviewerName,
  serializeProductStructuredData,
  summarizeProductReviews,
} from "./product-detail";

test("reconhece a faixa de CEP atendida em Ivate", () => {
  assert.deepEqual(getDeliveryAvailability("87525-000"), {
    available: true,
    normalizedPostalCode: "87525000",
    title: "Entrega gratis em Ivate",
  });
  assert.equal(getDeliveryAvailability("87527-999").available, true);
  assert.equal(getDeliveryAvailability("87528-000").available, false);
});

test("recusa CEP incompleto sem consultar servico externo", () => {
  assert.deepEqual(getDeliveryAvailability("8752"), {
    available: false,
    normalizedPostalCode: "8752",
    title: "Digite um CEP com 8 numeros",
  });
});

test("resume notas sem criar avaliacao ficticia", () => {
  assert.deepEqual(summarizeProductReviews([]), {
    average: null,
    count: 0,
    distribution: [0, 0, 0, 0, 0],
  });
  assert.deepEqual(summarizeProductReviews([5, 5, 4, 1]), {
    average: 3.8,
    count: 4,
    distribution: [1, 0, 0, 1, 2],
  });
});

test("abrevia o nome publico de quem avaliou", () => {
  assert.equal(publicReviewerName("Ana Maria Souza"), "Ana S.");
  assert.equal(publicReviewerName("Carlos"), "Carlos");
  assert.equal(publicReviewerName("   "), "Cliente Wimifarma");
});

test("valida nota e comentario da avaliacao", () => {
  assert.equal(
    productReviewInputSchema.safeParse({ comment: "Produto chegou bem embalado.", rating: 5 }).success,
    true,
  );
  assert.equal(productReviewInputSchema.safeParse({ comment: "curto", rating: 5 }).success, false);
  assert.equal(productReviewInputSchema.safeParse({ comment: "", rating: 6 }).success, false);
});

test("gera descricao SEO unica e legivel sem cortar palavras", () => {
  const description = buildProductMetaDescription({
    brand: "Cimed",
    description: "Cimegripe 20 capsulas da Cimed combina os principios ativos confirmados na bula em uma apresentacao pratica para consulta de preco e disponibilidade na farmacia local.",
    name: "Cimegripe 20 capsulas",
  });

  assert.ok(description.length <= 160);
  assert.match(description, /^Cimegripe 20 capsulas/i);
  assert.match(description, /[.!?]$/);
  assert.doesNotMatch(description, /\s[\p{L}\p{N}]{1,20}$/u);
});

test("gera descricao SEO segura quando o produto ainda nao tem descricao", () => {
  const description = buildProductMetaDescription({
    brand: "Cimed",
    description: null,
    name: "Cimegripe 20 capsulas",
  });

  assert.match(description, /Cimegripe 20 capsulas da Cimed/i);
  assert.match(description, /Wimifarma em Ivate-PR/i);
  assert.ok(description.length <= 160);
});

test("gera dados estruturados de produto apenas com informacoes reais", () => {
  const structuredData = buildProductStructuredData({
    brand: "Cimed",
    description: "Cimegripe 20 capsulas da Cimed em apresentacao para consulta na Wimifarma.",
    ean: "7896523200576",
    imageUrl: "/uploads/products/cimegripe.webp",
    name: "Cimegripe 20 capsulas",
    price: 9.99,
    rating: { average: 4.8, count: 12 },
    sku: null,
    slug: "cimegripe-20-capsulas",
    stock: 30,
  });

  assert.equal(structuredData["@type"], "Product");
  assert.equal(structuredData.gtin13, "7896523200576");
  assert.equal(structuredData.offers.availability, "https://schema.org/InStock");
  assert.equal(structuredData.aggregateRating?.reviewCount, 12);
  assert.equal(structuredData.offers.price, "9.99");
});

test("serializa JSON-LD sem permitir fechar a tag script", () => {
  const serialized = serializeProductStructuredData({
    description: "</script><script>alert(1)</script>",
  });

  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.match(serialized, /\\u003c\/script\\u003e/i);
});
