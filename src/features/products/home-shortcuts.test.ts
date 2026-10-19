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
