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

test("carrossel omite nomes comerciais e marcas desconhecidas de medicamentos", () => {
  const records = [
    { brand: "Aradois", catalogClassification: { kind: "MEDICINE" } },
    { brand: "Angipress", requiresPrescription: true },
    { brand: "Marca medicinal sintética", catalogClassification: { kind: "MEDICINE" } },
    { brand: "Marca de genérico sintética", category: "Genéricos" },
    { brand: "Marca de MIP sintética", category: "Medicamentos MIP" },
    { brand: "Marca Nova sem logo", category: "Perfumaria", catalogClassification: { kind: "NON_MEDICINE" } },
  ];
  assert.deepEqual(buildPublicBrands(records).map(brand => brand.name), ["Marca Nova sem logo"]);
  assert.deepEqual(matchingBrandNames(records, "Aradois"), ["Aradois"]);
});

test("laboratórios reconhecidos permanecem visíveis com medicamentos e receita", () => {
  const names = ["EMS", "Teuto", "Germed", "Sandoz", "Aché", "Althaia", "Biolab", "Biosintética", "Cimed", "Eurofarma", "Geolab", "Legrand", "Medley", "Medquímica", "Merck", "Momenta", "Nova Química", "Organon", "Pharlab", "Torrent", "Wyeth"];
  const brands = buildPublicBrands(names.map(brand => ({ brand, category: "Medicamentos", requiresPrescription: true, catalogClassification: { kind: "MEDICINE" } })));
  assert.deepEqual(new Set(brands.map(brand => brand.name)), new Set(names));
  assert.equal(brands.find(brand => brand.key === "nova quimica")?.href, "/catalogo?marca=Nova%20Qu%C3%ADmica&ordem=preco-asc");
  assert.equal(buildPublicBrands([{ brand: "Neo Química", requiresPrescription: true }]).length, 0);
});

test("qualquer variante medicinal oculta o grupo inteiro em qualquer ordem", () => {
  const records = [{ brand: "Marca Mista", category: "Perfumaria" }, { brand: " marca mista ", catalogClassification: { kind: "MEDICINE" } }];
  assert.deepEqual(buildPublicBrands(records), []);
  assert.deepEqual(buildPublicBrands([...records].reverse()), []);
  assert.deepEqual(matchingBrandNames(records, "MARCA MISTA"), ["Marca Mista", " marca mista "]);
});

test("nomes comerciais já triados não aparecem mesmo com classificação incompleta", () => {
  const names = ["Ablok", "Ablok Plus", "Adipept", "Angipress", "Aradois", "Corus", "Creslip", "Dispetic", "Divelol", "Galvus Met", "Glifage", "Meritor", "Plenance", "Renitec", "Rosucor", "Runner", "Sinvascor", "Sitglu Met", "Trezor", "Vaslip", "Vasopril", "Vasopril Plus"];
  assert.deepEqual(buildPublicBrands(names.map(brand => ({ brand, category: "Outros", requiresPrescription: false, catalogClassification: null }))), []);
});
