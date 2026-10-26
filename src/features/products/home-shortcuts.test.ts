import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeShortcuts, catalogGroup, groupCategoryNames } from "./home-shortcuts";

test("faixa contém somente ofertas e categorias internas, mesmo sem produtos cadastrados", () => {
  const shortcuts = buildHomeShortcuts();
  assert.deepEqual(shortcuts.map(({ id, label }) => ({ id, label })), [
    { id: "offers", label: "Ofertas" },
    { id: "baby", label: "Infantil" },
    { id: "medicines", label: "Medicamentos" },
    { id: "vitamins", label: "Vitaminas e suplementos" },
    { id: "dermo", label: "Dermo" },
    { id: "beauty", label: "Perfumaria" },
  ]);
  assert.equal(shortcuts[0].href, "/ofertas");
  for (const item of shortcuts.slice(1)) {
    const url = new URL(item.href, "https://wimifarma.com.br");
    assert.equal(url.origin, "https://wimifarma.com.br");
    assert.equal(url.pathname, "/catalogo");
    assert.equal(catalogGroup(url.searchParams.get("grupo")), item.id);
    assert.equal(url.searchParams.get("ordem"), "preco-asc");
  }
  assert.doesNotMatch(JSON.stringify(shortcuts), /wa\.me|whatsapp|farmacia-popular|delivery|_blank/i);
});

test("categorias relacionadas usam o grupo correto e categoria vazia permanece vazia", () => {
  const categories = [
    { name: "Cuidados com o BEBÊ" }, { name: "  REMÉDIOS  " }, { name: "Genéricos" },
    { name: "Suplementos alimentares" }, { name: "Dermocosméticos" }, { name: "Higiene e beleza" },
    { name: "Antivitaminas" },
  ];
  assert.deepEqual(groupCategoryNames(categories, "baby"), ["Cuidados com o BEBÊ"]);
  assert.deepEqual(groupCategoryNames(categories, "medicines"), ["  REMÉDIOS  ", "Genéricos"]);
  assert.deepEqual(groupCategoryNames(categories, "vitamins"), ["Suplementos alimentares"]);
  assert.deepEqual(groupCategoryNames(categories, "dermo"), ["Dermocosméticos"]);
  assert.deepEqual(groupCategoryNames(categories, "beauty"), ["Higiene e beleza"]);
  assert.deepEqual(groupCategoryNames([], "dermo"), []);
});

const shortcutProduct = (id: string, category: string, extra = {}) => ({
  id, name: id, slug: id, category, brand: null, imageUrl: `/uploads/products/${id}.webp`,
  price: "20.00", promotionalPrice: null, stock: 5, activeIngredients: [], searchTerms: [],
  requiresPrescription: false, isPopularPharmacy: false, prescriptionType: "UNREVIEWED" as const,
  ...extra,
});

test("círculos usam fotos reais da mesma categoria e oferta com desconto efetivo", () => {
  const products = [
    shortcutProduct("baby", "Fraldas"), shortcutProduct("dermo", "Dermocosméticos"),
    shortcutProduct("vitamins", "Suplementos"), shortcutProduct("beauty", "Perfumaria"),
    shortcutProduct("offer", "Perfumaria", { promotionalPrice: "15.00" }),
    shortcutProduct("medicine", "Medicamentos", { catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true } }),
  ];
  const shortcuts = buildHomeShortcuts(products, new Set(products.map(product => product.imageUrl)), new Date("2026-10-26T12:00:00Z"));
  for (const id of ["baby", "dermo", "vitamins", "medicines"] as const) {
    assert.equal(shortcuts.find(item => item.id === id)?.imageUrl, `/uploads/products/${id === "medicines" ? "medicine" : id}.webp`);
  }
  assert.equal(shortcuts[0].imageUrl, "/uploads/products/offer.webp");
  assert.match(shortcuts.find(item => item.id === "beauty")!.imageUrl!, /\/(beauty|offer)\.webp$/);
  assert.equal(shortcuts[0].href, "/ofertas");
  assert.equal(shortcuts.find(item => item.id === "medicines")!.href, "/catalogo?grupo=medicines&ordem=preco-asc");
});

test("foto ausente, privada, sem estoque, Rx e Popular mantêm ícone sem inventar cobertura", () => {
  const products = [
    shortcutProduct("private", "Fraldas", { imageUrl: "/api/admin/fornecedores/imagens/private.webp" }),
    shortcutProduct("missing", "Perfumaria"),
    shortcutProduct("unavailable", "Dermocosméticos", { stock: 0 }),
    shortcutProduct("rx", "Medicamentos", { requiresPrescription: true }),
    shortcutProduct("popular", "Suplementos", { isPopularPharmacy: true }),
    shortcutProduct("unclassified-medicine", "Medicamentos"),
  ];
  const photos = new Set(products.filter(product => product.id !== "missing").map(product => product.imageUrl));
  const shortcuts = buildHomeShortcuts(products, photos);
  assert.equal(shortcuts.length, 6);
  assert.ok(shortcuts.every(item => !item.imageUrl));
  assert.ok(shortcuts.every(item => item.href.startsWith("/")));
});
