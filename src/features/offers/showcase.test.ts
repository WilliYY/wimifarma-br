import assert from "node:assert/strict";
import test from "node:test";
import {
  arrangeShowcaseProducts,
  isShowcasePosition,
  productIdsFromShowcase,
  SHOWCASE_SLOT_COUNT,
  showcaseSelectionSchema,
  updateShowcaseProduct,
} from "./showcase";

test("mantem dez posicoes organizadas em dois grupos de cinco", () => {
  assert.equal(SHOWCASE_SLOT_COUNT, 10);
  assert.equal(SHOWCASE_SLOT_COUNT / 5, 2);

  const productIds = Array.from(
    { length: SHOWCASE_SLOT_COUNT },
    (_, index): string | null => (index < 2 ? `produto-${index + 1}` : null),
  );

  assert.equal(showcaseSelectionSchema.safeParse({ productIds }).success, true);
});

test("recusa o mesmo produto em duas posicoes", () => {
  const productIds = Array.from(
    { length: SHOWCASE_SLOT_COUNT },
    (): string | null => null,
  );
  productIds[0] = "produto-1";
  productIds[4] = "produto-1";

  assert.equal(showcaseSelectionSchema.safeParse({ productIds }).success, false);
});

test("organiza produtos na posicao exata da vitrine", () => {
  const slots = arrangeShowcaseProducts([
    { featuredPosition: 3, name: "Terceiro" },
    { featuredPosition: 1, name: "Primeiro" },
    { featuredPosition: null, name: "Fora da vitrine" },
  ]);

  assert.equal(slots.length, SHOWCASE_SLOT_COUNT);
  assert.equal(slots[0]?.name, "Primeiro");
  assert.equal(slots[1], null);
  assert.equal(slots[2]?.name, "Terceiro");
});

test("ignora posicoes antigas fora das dez atuais", () => {
  assert.equal(isShowcasePosition(10), true);
  assert.equal(isShowcasePosition(11), false);
  assert.equal(isShowcasePosition(null), false);
});

test("converte produtos destacados em dez ids ordenados", () => {
  const productIds = productIdsFromShowcase([
    { featuredPosition: 4, id: "produto-4" },
    { featuredPosition: 1, id: "produto-1" },
    { featuredPosition: null, id: "produto-fora" },
  ]);

  assert.equal(productIds.length, SHOWCASE_SLOT_COUNT);
  assert.equal(productIds[0], "produto-1");
  assert.equal(productIds[1], null);
  assert.equal(productIds[3], "produto-4");
});

test("coloca produto na primeira posicao livre e permite remover", () => {
  const current = Array.from(
    { length: SHOWCASE_SLOT_COUNT },
    (_, index): string | null => (index < 2 ? `produto-${index + 1}` : null),
  );

  const featured = updateShowcaseProduct(current, "produto-3", true);
  assert.equal(featured?.[2], "produto-3");

  const removed = updateShowcaseProduct(featured ?? current, "produto-2", false);
  assert.equal(removed?.[1], null);
});

test("nao altera a vitrine quando todas as posicoes estao ocupadas", () => {
  const full = Array.from(
    { length: SHOWCASE_SLOT_COUNT },
    (_, index) => `produto-${index + 1}`,
  );

  assert.equal(updateShowcaseProduct(full, "produto-11", true), null);
});
