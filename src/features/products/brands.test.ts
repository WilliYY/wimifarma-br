import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicBrands, matchingBrandNames } from "./brands";
import { brandLogo } from "./brand-logos";
import { existsSync } from "node:fs";
import path from "node:path";

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

test("Johnson’s e Baby formam uma marca e preservam o filtro das duas grafias", () => {
  const records = [{ brand: "Johnson’s Baby" }, { brand: "Johnson's" }, { brand: "JOHNSONS BABY" }, { brand: "Johnson & Johnson" }];
  const brands = buildPublicBrands(records);
  assert.equal(brands.length, 2);
  assert.deepEqual(brands.find(brand => brand.key === "johnson s"), { key: "johnson s", name: "Johnson’s", href: "/catalogo?marca=Johnson%E2%80%99s&ordem=preco-asc" });
  for (const selected of ["Johnson’s", "Johnson's Baby", "JOHNSONS"]) {
    assert.deepEqual(matchingBrandNames(records, selected), ["Johnson’s Baby", "Johnson's", "JOHNSONS BABY"]);
  }
  assert.equal(buildPublicBrands([...records].reverse()).find(brand => brand.key === "johnson s")?.name, "Johnson’s");
  assert.deepEqual(matchingBrandNames(records, "Johnson & Johnson"), ["Johnson & Johnson"]);
});

test("vitrine não transforma nome completo ou apresentação de produto em marca", () => {
  const records = [
    { brand: "Sabonete Sintético 90 g", name: "Sabonete Sintético 90 g", category: "Perfumaria" },
    { brand: "Hidratante Sintético 200mL", name: "Outro nome importado", category: "Perfumaria" },
    { brand: "Título indevido", name: " título indevido ", category: "Perfumaria" },
    { brand: "Marca Correta", name: "Sabonete Marca Correta 90 g", category: "Perfumaria" },
  ];
  assert.deepEqual(buildPublicBrands(records).map(brand => brand.name), ["Marca Correta"]);
  assert.deepEqual(matchingBrandNames(records, "Título indevido"), ["Título indevido"], "o filtro direto continua exato, sem reescrever cadastro");
});

test("descrição legada dos lenços usa a marca Natural Baby sem perder o filtro original", () => {
  const records = [{ brand: "Natural Baby Wipes Mãe e Filho", name: "Lenços Umedecidos Natural Baby Wipes Mãe e Filho 50 Folhas" }, { brand: "Natural Baby", name: "Toalhas infantis" }];
  assert.deepEqual(buildPublicBrands(records), [{ key: "natural baby", name: "Natural Baby", href: "/catalogo?marca=Natural%20Baby&ordem=preco-asc" }]);
  assert.deepEqual(matchingBrandNames(records, "Natural Baby"), ["Natural Baby Wipes Mãe e Filho", "Natural Baby"]);
});

test("marca nunca recebe foto de produto como identidade visual", () => {
  const records = ["b", "a"].map(key => ({ brand: "Marca Correta", name: `Sabonete ${key}`, category: "Perfumaria", imageUrl: `/uploads/products/${key}.webp`, imageAsset: { url: `/uploads/products/${key}.webp` } }));
  const expected = [{ key: "marca correta", name: "Marca Correta", href: "/catalogo?marca=Marca%20Correta&ordem=preco-asc" }];
  assert.deepEqual(buildPublicBrands(records), expected);
  assert.deepEqual(buildPublicBrands([...records].reverse()), expected);
});

test("KitKat e Kit Kat formam uma marca própria sem agrupar o fabricante", () => {
  const records = [{ brand: "Kit Kat" }, { brand: "KitKat" }, { brand: "Nestlé" }, { brand: "Huggies" }, { brand: "Kimberly-Clark" }];
  const brands = buildPublicBrands(records);
  assert.equal(brands.length, 4);
  assert.deepEqual(brands.find(brand => brand.key === "kitkat"), { key: "kitkat", name: "KitKat", href: "/catalogo?marca=KitKat&ordem=preco-asc" });
  for (const alias of ["Kit Kat", "KITKAT"]) assert.deepEqual(matchingBrandNames(records, alias), ["Kit Kat", "KitKat"]);
  assert.deepEqual(matchingBrandNames(records, "Huggies"), ["Huggies"]);
});

test("Huggies, Huppy Baby, Intimus e KitKat usam assets locais de logo próprios", () => {
  for (const name of ["Huggies", "Huppy Baby", "Intimus", "KitKat", "Kit Kat"]) {
    const logo = brandLogo(name);
    assert.ok(logo);
    assert.match(logo.src, /^\/brands\/(?:huggies|huppy-baby|intimus|kitkat)\.webp$/);
    assert.ok(existsSync(path.join(process.cwd(), "public", logo.src)));
  }
  assert.equal(brandLogo("Hydraporin"), null);
});

test("marca não usa embalagem medicinal, imagem privada, remota ou placeholder", () => {
  const records = [
    { brand: "EMS", name: "Medicamento sintético", category: "Medicamentos", imageUrl: "/uploads/products/medicine.webp", imageAsset: { url: "/uploads/products/medicine.webp" } },
    { brand: "Privada", imageUrl: "/api/private/image.webp", imageAsset: { url: "/api/private/image.webp" } },
    { brand: "Remota", imageUrl: "https://example.invalid/photo.webp", imageAsset: { url: "https://example.invalid/photo.webp" } },
    { brand: "Genérica", imageUrl: "/brand/placeholder.webp", imageAsset: { url: "/brand/placeholder.webp" } },
    { brand: "Divergente", imageUrl: "/uploads/products/photo.webp", imageAsset: { url: "/uploads/products/other.webp" } },
    { brand: "Sem biblioteca", imageUrl: "/uploads/products/photo.webp" },
    { brand: "Popular", isPopularPharmacy: true, imageUrl: "/uploads/products/photo.webp", imageAsset: { url: "/uploads/products/photo.webp" } },
  ];
  assert.ok(buildPublicBrands(records).every(brand => !("imageUrl" in brand)));
});
