import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test, { after, before } from "node:test";
import type { PublicPmcReference } from "@/features/products/cmed-reference";
import { ProductPmcBadge, ProductPmcPrice } from "./product-pmc";

const previousReact = Reflect.get(globalThis, "React");
before(() => { Reflect.set(globalThis, "React", React); });
after(() => {
  if (previousReact === undefined) Reflect.deleteProperty(globalThis, "React");
  else Reflect.set(globalThis, "React", previousReact);
});

const reference: PublicPmcReference = {
  amountCents: 1000, column: "PMC 18 %", publishedOn: "2026-10-29",
  sourceUrl: "https://www.gov.br/anvisa/pt-br", presentation: "Apresentação sintética",
  laboratory: "Laboratório sintético", registration: "1234567890123", rates: [],
};

test("referência neutra não ocupa a apresentação pública do preço", () => {
  assert.equal(renderToStaticMarkup(createElement(ProductPmcPrice, { reference })), "");
});

test("economia elegível mantém valor riscado e OFF sem rótulos técnicos ou preço anterior inventado", () => {
  const price = renderToStaticMarkup(createElement(ProductPmcPrice, { reference, strike: true }));
  assert.match(price, /<s>R\$\s*10,00<\/s>/);
  assert.match(price, /Não é preço anterior da loja/);
  assert.doesNotMatch(price, /PMC|CMED|>De /);
  const badge = renderToStaticMarkup(createElement(ProductPmcBadge, { percent: 31 }));
  assert.match(badge, /31% OFF/);
  assert.match(badge, /preço máximo de referência/);
  assert.doesNotMatch(badge, /PMC|CMED/);
});
