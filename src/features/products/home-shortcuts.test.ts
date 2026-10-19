import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeShortcuts } from "./home-shortcuts";

const phone = "5544999990000";

test("atalhos preservam a ordem e os slugs fornecidos pelo catálogo", () => {
  const categories = [
    { name: "Infantil", slug: "linha-bebe-real" },
    { name: "Medicamentos", slug: "medicamentos-publicados" },
    { name: "Vitaminas e suplementos", slug: "vitaminas & suplementos" },
    { name: "Dermo", slug: "cuidados-reais" },
    { name: "Perfumaria", slug: "perfumaria-real" },
  ] as const;
  const shortcuts = buildHomeShortcuts(categories, phone);
  assert.deepEqual(shortcuts.map(({ id, label }) => ({ id, label })), [
    { id: "offers", label: "Ofertas" },
    { id: "baby", label: "Infantil" },
    { id: "medicines", label: "Medicamentos" },
    { id: "vitamins", label: "Vitaminas e suplementos" },
    { id: "dermo", label: "Dermo" },
    { id: "beauty", label: "Perfumaria" },
    { id: "popular", label: "Farmácia Popular" },
    { id: "delivery", label: "Delivery" },
  ]);
  assert.deepEqual(shortcuts.map(item => item.href), [
    "/ofertas", "/catalogo?grupo=baby&ordem=preco-asc", "/catalogo?grupo=medicines&ordem=preco-asc",
    "/catalogo?grupo=vitamins&ordem=preco-asc", "/catalogo?grupo=dermo&ordem=preco-asc",
    "/catalogo?grupo=beauty&ordem=preco-asc", "/farmacia-popular", "/delivery",
  ]);
  assert.ok(shortcuts.every(item => !item.external));
});

test("nomes com acentos, caixa e sinônimos identificam categorias coerentes", () => {
  const shortcuts = buildHomeShortcuts([
    { name: "Cuidados com o BEBÊ", slug: "bebe" },
    { name: "  REMÉDIOS  ", slug: "remedios" },
    { name: "Suplementos alimentares", slug: "suplementos" },
    { name: "Dermocosméticos", slug: "dermocosmeticos" },
    { name: "Higiene e beleza", slug: "beleza" },
  ], phone);
  assert.deepEqual(shortcuts.slice(1, 6).map(item => item.href), [
    "/catalogo?grupo=baby&ordem=preco-asc", "/catalogo?grupo=medicines&ordem=preco-asc", "/catalogo?grupo=vitamins&ordem=preco-asc",
    "/catalogo?grupo=dermo&ordem=preco-asc", "/catalogo?grupo=beauty&ordem=preco-asc",
  ]);
});

test("atalhos agrupam categorias exatas e relacionadas", () => {
  const shortcuts = buildHomeShortcuts([
    { name: "Medicamentos naturais", slug: "naturais" },
    { name: "Medicamentos", slug: "todos-medicamentos" },
    { name: "Vitaminas", slug: "vitaminas" },
    { name: "Vitaminas e suplementos", slug: "grupo-completo" },
  ], phone);
  assert.equal(shortcuts[2].href, "/catalogo?grupo=medicines&ordem=preco-asc");
  assert.equal(shortcuts[3].href, "/catalogo?grupo=vitamins&ordem=preco-asc");
});

test("categorias ausentes consultam o assunto pelo WhatsApp sem promessas comerciais", () => {
  const shortcuts = buildHomeShortcuts([
    { name: "Alimentos", slug: "alimentos" },
    { name: "Antivitaminas", slug: "antivitaminas" },
  ], phone);
  for (const item of shortcuts.slice(1, 6)) {
    assert.equal(item.external, true);
    const url = new URL(item.href);
    assert.equal(url.origin, "https://wa.me");
    assert.equal(url.pathname, `/${phone}`);
    assert.equal(url.searchParams.get("text"), `Olá! Gostaria de consultar a equipe sobre ${item.label.toLowerCase()}.`);
    assert.equal(url.search, `?text=${encodeURIComponent(url.searchParams.get("text")!)}`);
  }
  assert.deepEqual(shortcuts.filter(item => !item.external).map(item => item.href), [
    "/ofertas", "/farmacia-popular", "/delivery",
  ]);
  assert.doesNotMatch(JSON.stringify(shortcuts), /cupom|cupons|desconto|disponibilidade garantida/i);
});
