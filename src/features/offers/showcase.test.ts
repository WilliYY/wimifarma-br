import assert from "node:assert/strict";
import test from "node:test";
import {
  arrangeShowcaseProducts,
  SHOWCASE_SLOT_COUNT,
  showcaseSelectionSchema,
} from "./showcase";

test("aceita quinze posicoes com produtos unicos e espacos vazios", () => {
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
