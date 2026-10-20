import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicBrands, matchingBrandNames } from "./brands";

test("marcas públicas removem vazios, agrupam grafias equivalentes e ordenam por nome", () => {
  const brands = buildPublicBrands([{ brand: " Zeta " }, { brand: null }, { brand: " " }, { brand: "Água & Sol" }, { brand: "agua sol" }, { brand: "Beta" }]);
  assert.deepEqual(brands, [
    { key: "agua sol", name: "Água & Sol", href: "/catalogo?marca=%C3%81gua%20%26%20Sol&ordem=preco-asc" },
    { key: "beta", name: "Beta", href: "/catalogo?marca=Beta&ordem=preco-asc" },
    { key: "zeta", name: "Zeta", href: "/catalogo?marca=Zeta&ordem=preco-asc" },
  ]);
});

test("filtro de marca reúne somente variantes completas sem substring", () => {
  const records = [{ brand: "Água & Sol" }, { brand: " agua sol " }, { brand: "Agua Sol Extra" }, { brand: null }];
  assert.deepEqual(matchingBrandNames(records, "ÁGUA SOL"), ["Água & Sol", " agua sol "]);
  assert.deepEqual(matchingBrandNames(records, "Agua"), []);
  assert.deepEqual(matchingBrandNames(records, "..."), []);
});
