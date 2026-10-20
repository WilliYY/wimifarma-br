import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicProductDescription } from "./product-description";

const importedProduct = {
  brand: "Vichy",
  category: "Dermocosméticos",
  description: "SH DERCOS COLLAGEN REPAIR 17 200G, marca Vichy, conforme a apresentação identificada pelo EAN. Confira o rótulo, o modo de uso e as advertências da embalagem antes de utilizar. Conserve conforme as orientações do fabricante.",
  ean: "07908966523652",
  name: "SH DERCOS COLLAGEN REPAIR 17 200G",
};

test("troca o template importado por uma descrição do Dercos conferido", () => {
  const text = buildPublicProductDescription(importedProduct);
  assert.match(text, /Shampoo Vichy Dercos Collagen Repair 17 200 g/);
  assert.match(text, /peptídeos pró-colágeno e ácido cítrico/);
  assert.doesNotMatch(text, /identificada pelo EAN|97%|cura|garantido/i);
  assert.ok(text.split("\n\n").length >= 2);
  assert.equal(buildPublicProductDescription({ ...importedProduct, ean: "7908966523652" }), text);
});

test("preserva o texto editorial, inclusive suas quebras de linha", () => {
  const description = "Uma descrição já revisada.\n\nConfira as informações específicas deste produto.";
  assert.equal(buildPublicProductDescription({ ...importedProduct, description }), description);
  assert.equal(buildPublicProductDescription({ ...importedProduct, description: `${importedProduct.description} Informação revisada.` }), `${importedProduct.description} Informação revisada.`);
});

test("não transfere benefícios entre shampoo, condicionador, pré-shampoo e tamanhos", () => {
  for (const [name, ean] of [
    ["COND DERCOS COLLAGEN REPAIR 17 200G", "07908966523737"],
    ["PRE SH DERCOS COLLAGEN REPAIR 17 150G", "07908966523775"],
    ["SH DERCOS COLLAGEN REPAIR 17 390G", "07908966523690"],
  ]) {
    const text = buildPublicProductDescription({ ...importedProduct, description: null, name, ean });
    assert.doesNotMatch(text, /peptídeos pró-colágeno|200 g|espuma suave/);
    assert.match(text, new RegExp(name));
  }
  assert.doesNotMatch(buildPublicProductDescription({ ...importedProduct, name: "COND DERCOS 200G" }), /peptídeos pró-colágeno/);
  assert.doesNotMatch(buildPublicProductDescription({ ...importedProduct, brand: "Outra marca" }), /peptídeos pró-colágeno/);
});

test("diferencia limpeza, hidratação e proteção sem prometer eficácia específica", () => {
  const product = { ...importedProduct, description: null, ean: null };
  assert.match(buildPublicProductDescription({ ...product, name: "AGUA MICELAR 200ML" }), /limpeza facial/);
  assert.match(buildPublicProductDescription({ ...product, name: "HIDRATANTE CORPORAL 400ML" }), /cuidado com o corpo/);
  assert.match(buildPublicProductDescription({ ...product, name: "PROTETOR SOLAR FPS 60 50G" }), /proteção solar/);
  assert.doesNotMatch(buildPublicProductDescription({ ...product, name: "AFTER SUN 200ML" }), /etapa de proteção solar/);
});

test("não transforma fator solar de hidratante em protetor dedicado", () => {
  const text = buildPublicProductDescription({ ...importedProduct, description: null, ean: null, name: "CREME FACIAL NUTRITIVO FPS 15 100G" });
  assert.match(text, /cuidado facial/);
  assert.doesNotMatch(text, /etapa de proteção solar/);
});

test("reconhece abreviações do cadastro sem confundir regiões ou uso noturno", () => {
  const product = { ...importedProduct, description: null, ean: null };
  assert.match(buildPublicProductDescription({ ...product, name: "HIDRATANTE LAB NIVEA SUN PROT FPS30 4,8G" }), /lábios/);
  assert.match(buildPublicProductDescription({ ...product, name: "GEL ESFOL ISDIN ACNIBEN SUAVE 105G" }), /esfoliação/);
  assert.match(buildPublicProductDescription({ ...product, name: "HIDRATANTE FAC MINERAL 89 40ML" }), /cuidado facial/);
  assert.match(buildPublicProductDescription({ ...product, name: "FOTOP ISDIN PEDIATRICS FPS50 20G" }), /proteção solar/);
  assert.doesNotMatch(buildPublicProductDescription({ ...product, name: "SERUM ISDIN ERYFOTONA NIGHT 50ML" }), /proteção solar/);
  assert.match(buildPublicProductDescription({ ...product, name: "SERUM P/OLHO LIFTACTIV COLLAGEN 16 15ML" }), /olhos/);
});

test("medicamentos e Farmácia Popular não recebem discurso de cosmético", () => {
  for (const rules of [
    { requiresPrescription: true },
    { prescriptionType: "CONTROLLED" as const },
    { isPopularPharmacy: true },
    { category: "Medicamentos" },
  ]) {
    const text = buildPublicProductDescription({ ...importedProduct, description: null, ...rules });
    assert.match(text, /farmacêutico/);
    assert.doesNotMatch(text, /peptídeos|ritual|fortalecer|melhor preço|compre agora/i);
  }
});

test("medicamento isento de receita usa a classificação administrativa como fonte", () => {
  const text = buildPublicProductDescription({
    ...importedProduct,
    name: "Analgésico roll-on 50 ml",
    description: null,
    category: "Analgésicos",
    requiresPrescription: false,
    prescriptionType: "UNREVIEWED",
    catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true },
  });
  assert.match(text, /farmacêutico/);
  assert.doesNotMatch(text, /axilas|ritual|autocuidado|fragrância/i);
});

test("texto vazio e tipo desconhecido recebem orientação útil sem inventar características", () => {
  const text = buildPublicProductDescription({ name: "Item 123", brand: null, category: null, description: "   " });
  assert.match(text, /Item 123/);
  assert.match(text, /equipe da Wimifarma/);
  assert.doesNotMatch(text, /null|undefined|hipoalergênic|dermatologicamente|24 horas|entrega grátis|em estoque/i);
});

test("nome, variante e unidade cadastrados continuam na descrição geral", () => {
  const name = "SUNFRESH COM COR FPS70 40G";
  const text = buildPublicProductDescription({ name, brand: "Neutrogena", category: "Dermocosméticos", description: null });
  assert.match(text, /SUNFRESH COM COR FPS70 40G/);
  assert.match(text, /Neutrogena/);
  assert.doesNotMatch(text, /40 ml|sem cor/i);
});
