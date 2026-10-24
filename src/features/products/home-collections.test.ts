import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeCollections, brasiliaDay, commercialPrice, homeProductFamily } from "./home-collections";
import { readClassification } from "./catalog-operations";

const item = (id: string, extra = {}) => ({ id, name: id, slug: id, imageUrl: `/uploads/products/${id}.webp`, price: "10.00", promotionalPrice: null, brand: null, category: "Perfumaria", stock: 2, requiresPrescription: false, prescriptionType: "UNREVIEWED" as const, isPopularPharmacy: false, activeIngredients: [], searchTerms: [], ...extra });
const otc = { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true };
const hygiene = { kind: "HYGIENE", medicineClass: "UNCLASSIFIED", ethical: false, otc: false };
const build = (products: ReturnType<typeof item>[], date = new Date("2026-10-19T12:00:00Z")) => buildHomeCollections(products, new Set(products.map(p => p.imageUrl)), date);

test("Farmacinha completa 15 itens com MIPs e cuidados classificados sem repetir outras vitrines", () => {
  const medicines = Array.from({ length: 3 }, (_, i) => item(`mip-${i}`, { category: "Medicamentos", price: "50", catalogClassification: otc }));
  const care = Array.from({ length: 45 }, (_, i) => item(`care-${i}`, { catalogClassification: hygiene }));
  const result = build([...medicines, ...care, item("rx-disguised", { catalogClassification: hygiene, requiresPrescription: true }), item("inconsistent", { name: "Curativo inconsistente", catalogClassification: { ...hygiene, medicineClass: "GENERIC" } })]);
  assert.equal(result.otc.length, 15);
  assert.equal(result.otc.filter(product => medicines.some(medicine => medicine.id === product.id)).length, 3);
  assert.equal(result.otc.filter(product => readClassification(product.catalogClassification).kind === "HYGIENE").length, 12);
  assert.equal(result.otc.some(product => ["rx-disguised", "inconsistent"].includes(product.id)), false);
  const ids = Object.values(result).flat().map(product => product.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("Farmacinha prioriza primeiros socorros e não usa medicamento desconhecido nem perfume para completar", () => {
  const cheap = Array.from({ length: 5 }, (_, i) => item(`cheap-${i}`, { category: "Chocolates", price: "1" }));
  const care = Array.from({ length: 20 }, (_, i) => item(`care-${i}`, { catalogClassification: hygiene }));
  const result = build([...cheap, ...care, item("bandage", { name: "Curativo adesivo", catalogClassification: hygiene }), item("unknown", { category: "Medicamentos" }), item("perfume", { name: "Perfume floral", catalogClassification: { ...hygiene, kind: "PERFUMERY" } })]);
  assert.equal(result.otc.length, 15);
  assert.equal(result.otc[0].id, "bandage");
  assert.equal(result.otc.some(product => ["unknown", "perfume"].includes(product.id)), false);
});

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

test("economia rotaciona a faixa de entrada e completa sem repetir outras vitrines", () => {
  const products = Array.from({ length: 30 }, (_, i) => item(`p-${i}`, { price: String(i + 2) }));
  products.push(item("promo", { price: "100", promotionalPrice: "1" }));
  for (const date of [new Date("2026-10-19"), new Date("2026-10-20")]) {
    const result = build(products, date);
    assert.ok(result.affordable.slice(0, 5).some(product => product.id === "promo"));
    assert.ok(result.affordable.slice(0, 5).every(product => commercialPrice(product) <= 8));
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
  assert.deepEqual(result.affordable.map(product => product.id).sort(), ["care-0", "care-1", "care-2", "care-3"]);
  assert.equal(new Set([...result.care, ...result.affordable].map(product => product.id)).size, 9);
});

test("famílias agrupam variações e princípios ativos sem classificar nem liberar medicamentos", () => {
  assert.equal(homeProductFamily(item("soap-a", { name: "Sabonete Nivea Aveia 85g" })), homeProductFamily(item("soap-b", { name: "Sabonete Nivea Leite 85g" })));
  assert.equal(homeProductFamily(item("mip-a", { catalogClassification: otc, activeIngredients: ["simeticona"] })), homeProductFamily(item("mip-b", { catalogClassification: otc, activeIngredients: ["SIMETICONA"] })));
  assert.notEqual(homeProductFamily(item("lip", { name: "Hidratante LAB NIVEA FPS15" })), homeProductFamily(item("sun", { name: "Nivea SUN Protetor solar FPS50 200ml" })));
  assert.notEqual(homeProductFamily(item("bronze", { name: "Nivea SUN FPS6 125ml" })), "sun");
  assert.notEqual(homeProductFamily(item("low-spf", { name: "Anthelios FPS20 50ml" })), "sun");
});

test("cuidados começa por cinco famílias diferentes e alterna suas âncoras diariamente", () => {
  const families = ["Sabonete", "Desodorante", "Shampoo", "Protetor solar", "Fralda", "Creme dental", "Hidratante corporal"];
  const products = families.flatMap((name, family) => Array.from({ length: 10 }, (_, variant) => item(`f-${family}-${variant}`, { name: `${name} Marca ${variant}`, price: String(10 + family * 10 + variant), catalogClassification: hygiene })));
  const first = build(products);
  assert.equal(first.care.length, 15);
  assert.equal(new Set(first.care.slice(0, 5).map(homeProductFamily)).size, 5);
  assert.notDeepEqual(first.care.slice(0, 5), build(products, new Date("2026-10-20T12:00:00Z")).care.slice(0, 5));
  assert.deepEqual(first, build([...products].reverse()));
});

test("economia não ocupa os cinco primeiros espaços com fragrâncias do mesmo sabonete", () => {
  const products = ["Sabonete", "Shampoo", "Desodorante", "Fralda", "Creme dental"].flatMap((name, family) => Array.from({ length: 20 }, (_, variant) => item(`a-${family}-${variant}`, { name: `${name} Variação ${variant}`, price: String(3 + family + variant / 100), catalogClassification: hygiene })));
  const first = build(products);
  assert.ok(new Set(first.affordable.slice(0, 5).map(homeProductFamily)).size >= 2);
  assert.notDeepEqual(first.affordable.slice(0, 5), build(products, new Date("2026-10-20T12:00:00Z")).affordable.slice(0, 5));
});

test("Farmacinha diversifica princípios ativos antes de repetir laboratórios ou embalagens", () => {
  const medicines = ["simeticona", "paracetamol", "loratadina", "ibuprofeno", "acetilcisteina", "dipirona"].flatMap((ingredient, group) => Array.from({ length: 8 }, (_, variant) => item(`m-${group}-${variant}`, { name: `${ingredient} Laboratório ${variant}`, activeIngredients: [ingredient], category: "Medicamentos", catalogClassification: otc, price: String(20 + group + variant) })));
  const cheap = Array.from({ length: 10 }, (_, index) => item(`cheap-${index}`, { price: "1" }));
  const first = build([...cheap, ...medicines]);
  assert.equal(new Set(first.otc.slice(0, 5).map(homeProductFamily)).size, 5);
});

test("pacote infantil caro não toma a posição de entrada quando há lenços acessíveis", () => {
  const types = ["Sabonete", "Desodorante", "Shampoo", "Hidratante", "Protetor solar", "Creme dental"];
  const products = types.flatMap((name, group) => Array.from({ length: 10 }, (_, index) => item(`p-${group}-${index}`, { name: `${name} ${index}`, price: "10", catalogClassification: hygiene })));
  products.push(item("baby-cheap", { name: "Lenços umedecidos 48 unidades", price: "10.72", catalogClassification: hygiene }), item("baby-middle", { name: "Toalhinhas 44 unidades", price: "16.67", catalogClassification: hygiene }), item("baby-expensive", { name: "Fralda Pampers M70", price: "183.63", catalogClassification: hygiene }));
  for (let day = 1; day <= 14; day++) {
    const result = build(products, new Date(`2026-10-${String(day).padStart(2, "0")}T12:00:00Z`));
    assert.equal(result.care.slice(0, 5).some(product => product.id === "baby-expensive"), false);
  }
});
