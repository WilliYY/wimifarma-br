import assert from "node:assert/strict";
import test from "node:test";
import {
  getDeliveryAvailability,
  productReviewInputSchema,
  publicReviewerName,
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
