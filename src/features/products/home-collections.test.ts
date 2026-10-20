import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeCollections, brasiliaDay, commercialPrice } from "./home-collections";

const item = (id: string, extra = {}) => ({ id, name: id, slug: id, imageUrl: `/uploads/products/${id}.webp`, price: "10.00", promotionalPrice: null, brand: null, category: "Perfumaria", stock: 2, requiresPrescription: false, prescriptionType: "UNREVIEWED" as const, isPopularPharmacy: false, activeIngredients: [], searchTerms: [], ...extra });
const otc = { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true };
const build = (products: ReturnType<typeof item>[], date = new Date("2026-10-19T12:00:00Z")) => buildHomeCollections(products, new Set(products.map(p => p.imageUrl)), date);

test("vitrines exigem foto validada, disponibilidade e classificação MIP explícita", () => {
  const products = [item("care"), item("otc", { catalogClassification: otc, category: "Medicamentos", price: "12.00" }), item("unknown", { category: "Medicamentos" }), item("rx", { requiresPrescription: true, catalogClassification: otc }), item("empty", { stock: 0 }), item("illustration", { imageUrl: "/brand/medicamento-sem-foto.webp" })];
  const result = build(products);
  assert.deepEqual(result.otc.map(p => p.id), ["otc"]);
  assert.ok(!JSON.stringify(result).includes('"rx"'));
  assert.ok(!JSON.stringify(result).includes('"empty"'));
  assert.ok(!JSON.stringify(result).includes('"illustration"'));
  assert.deepEqual(buildHomeCollections(products, new Set(), new Date()).care, []);
});

test("rotação usa dia de Brasília e é determinística, sem duplicar produtos", () => {
  assert.equal(brasiliaDay(new Date("2026-10-20T02:59:59Z")), "2026-10-19");
  assert.equal(brasiliaDay(new Date("2026-10-20T03:00:00Z")), "2026-10-20");
  const products = Array.from({ length: 40 }, (_, i) => item(`care-${i}`));
  const first = build(products);
  assert.equal(first.care.length, 15);
  assert.equal(new Set(first.care.map(p => p.id)).size, 15);
  assert.deepEqual(first, build([...products].reverse()));
  assert.notDeepEqual(first.care, build(products, new Date("2026-10-20T12:00:00Z")).care);
});

test("menores preços mantém os cinco mais baratos e completa sem repetir outras vitrines", () => {
  const products = Array.from({ length: 30 }, (_, i) => item(`p-${i}`, { price: String(i + 2) }));
  products.push(item("promo", { price: "100", promotionalPrice: "1" }));
  for (const date of [new Date("2026-10-19"), new Date("2026-10-20")]) {
    const result = build(products, date);
    assert.equal(result.affordable[0].id, "promo");
    assert.deepEqual(result.affordable.slice(0, 5).map(commercialPrice), [1, 2, 3, 4, 5]);
    assert.equal(result.affordable.length, 15);
    const careIds = new Set(result.care.map(product => product.id));
    assert.ok(result.affordable.every(product => !careIds.has(product.id)));
  }
  assert.notDeepEqual(build(products, new Date("2026-10-19")).affordable, build(products, new Date("2026-10-20")).affordable);
});

test("acervo escasso não cria três faixas idênticas nem preenche vagas fictícias", () => {
  const result = build([item("one", { catalogClassification: otc, category: "Medicamentos" })]);
  assert.equal(result.otc.length, 1);
  assert.equal(result.care.length, 0);
  assert.equal(result.affordable.length, 0);
});

test("MIP confirmado não se repete em cuidados e classe ausente não vira medicamento OTC", () => {
  const result = build([item("care"), item("cheap", { category: "Medicamentos", price: "2", catalogClassification: otc }), item("unknown", { category: "Medicamentos", price: "1" })]);
  assert.deepEqual(result.care.map(product => product.id), ["care"]);
  assert.deepEqual(result.otc.map(product => product.id), ["cheap"]);
  assert.deepEqual(result.affordable.map(product => product.id), ["unknown"]);
});

test("todas as vitrines usam produtos exclusivos em dias e acervos diferentes", () => {
  for (const count of [0, 1, 2, 7, 9, 15, 31, 80]) {
    const products = Array.from({ length: count }, (_, i) => item(`p-${i}`, {
      price: String(i + 1),
      ...(i % 3 === 0 ? { category: "Medicamentos", catalogClassification: otc } : {}),
    }));
    for (const date of [new Date("2026-10-19T12:00:00Z"), new Date("2026-10-20T12:00:00Z")]) {
      const result = build([...products, ...products], date);
      const ids = Object.values(result).flat().map(product => product.id);
      assert.equal(new Set(ids).size, ids.length, `repetição com ${count} produtos`);
      assert.ok(Object.values(result).every(collection => collection.length <= 15));
      assert.deepEqual(result, build([...products].reverse(), date));
      if (count >= 2) assert.ok(Object.values(result).filter(collection => collection.length).length >= 2);
    }
  }
});

test("acervo pequeno de cuidados mantém duas vitrines com produtos distintos", () => {
  const products = Array.from({ length: 9 }, (_, i) => item(`care-${i}`, { price: String(i + 1) }));
  const result = build(products);
  assert.equal(result.care.length, 5);
  assert.deepEqual(result.affordable.map(product => product.id), ["care-0", "care-1", "care-2", "care-3"]);
  assert.equal(new Set([...result.care, ...result.affordable].map(product => product.id)).size, 9);
});
