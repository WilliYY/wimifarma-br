import assert from "node:assert/strict";
import test from "node:test";
import { qualifyShippingReference, sameShippingVariant, shippingEstimateSchema, shippingReferenceSchema, shippingResearchInstructions } from "./product-reference";
import { shippingDraftSchema, invalidateShippingProfile } from "./product-draft";
import { shippingProfileSchema } from "./schema";
import { validateShippingProduct } from "./rules";
import { productCreateSchema } from "../products/schema";

const evidenceWeight = "Peso bruto da unidade: 0,35 kg com embalagem comercial.";
const evidenceDimensions = "Largura 80 mm, altura 200 mm, comprimento 100 mm da unidade.";
const reference = () => ({ identityMatch: "exact", packageLevel: "retail_unit", weight: { value: 0.35, unit: "kg", kind: "gross", sourceIndex: 0, evidence: evidenceWeight }, dimensions: { width: 80, height: 200, length: 100, unit: "mm", sourceIndex: 0, evidence: evidenceDimensions }, warnings: [] });
const context = { name: "Perfume sintético 300 ml", exactIdentity: true, research: `${evidenceWeight}\n${evidenceDimensions}`, sources: [{ title: "Ficha técnica sintética", url: "https://example.com/produto" }] };

const targetEvidence = `${context.name}; frasco fechado plástico 300 ml.`;
const comparableEvidence = "Perfume comparável 300 ml; frasco fechado plástico 300 ml; peso bruto 0,35 kg; largura 8 cm, altura 20 cm, comprimento 10 cm.";
const estimateReference = () => ({ ...reference(), weight: null, dimensions: null, estimate: {
  comparableName: "Perfume comparável 300 ml", packageDescription: "frasco fechado plástico 300 ml", packageLevel: "retail_unit",
  productFamily: "perfume", packageMaterial: "plástico", targetSourceIndex: 0, targetEvidence,
  sourceIndex: 0, evidence: comparableEvidence, assumptions: ["Mesma apresentação e formato de frasco; conferir tampa e proteção reais."],
  weight: { value: 0.35, unit: "kg", kind: "gross" }, dimensions: { width: 8, height: 20, length: 10, unit: "cm" },
} });
const estimateContext = { ...context, research: `${targetEvidence}\n${context.research}\n${comparableEvidence}` };

test("thin comparable packages retain conservative sub-centimeter ranges", () => {
  for (const height of [0.5, 0.05, 1.1]) {
    const raw = estimateReference();
    const name = "Curativo alvo 1 unidade";
    const comparableName = "Curativo comparável 1 unidade";
    const packageDescription = "envelope fechado plástico 1 unidade";
    const target = `${name}; ${packageDescription}.`;
    const evidence = `${comparableName}; ${packageDescription}; largura 8 cm, altura ${height} cm, comprimento 10 cm.`;
    const estimate = { ...raw.estimate, comparableName, packageDescription, productFamily: "curativo", targetEvidence: target, evidence, weight: null, dimensions: { ...raw.estimate.dimensions, height } };
    const result = qualifyShippingReference({ ...raw, estimate }, { ...context, name, research: `${target}\n${evidence}` });
    const range = result?.estimate?.heightCm;
    assert.ok(range, `height ${height} cm remains usable`);
    assert.ok(range.min > 0 && range.min <= height * 0.8);
    assert.ok(range.max >= height * 1.2);
    assert.equal(result?.heightCm, null);
  }
});

test("dental cream and dental paste share a specific family without allowing mixed creams", () => {
  const raw = estimateReference();
  const name = "Creme dental alvo 90 g";
  const comparableName = "Pasta dental comparável 90 g";
  const packageDescription = "bisnaga fechada plástico 90 g";
  const target = `${name}; ${packageDescription}.`;
  const evidence = `${comparableName}; ${packageDescription}; peso bruto 110 g; largura 4 cm, altura 3 cm, comprimento 15 cm.`;
  const estimate = { ...raw.estimate, comparableName, packageDescription, productFamily: "pasta dental", targetEvidence: target, evidence, weight: { value: 110, unit: "g", kind: "gross" }, dimensions: { width: 4, height: 3, length: 15, unit: "cm" } };
  assert.ok(qualifyShippingReference({ ...raw, estimate }, { ...context, name, research: `${target}\n${evidence}` })?.estimate);
  const mixed = "Creme dental e creme corporal alvo 90 g";
  const mixedTarget = `${mixed}; ${packageDescription}.`;
  assert.equal(qualifyShippingReference({ ...raw, estimate: { ...estimate, targetEvidence: mixedTarget } }, { ...context, name: mixed, research: `${mixedTarget}\n${evidence}` })?.estimate ?? null, null);
});

test("diaper comparables require compatible explicit adult or infant audiences", () => {
  for (const [targetAudience, comparableAudience, allowed] of [
    ["infantil", "adulta", false], ["adulta", "infantil", false],
    ["geriátrica", "infantil", false], ["infantil", "", false],
    ["", "adulta", false], ["", "", false], ["adulta infantil", "adulta infantil", false],
    ["infantil", "infantil", true], ["adulta", "adulta", true], ["geriátrica", "adulta", true],
  ] as const) {
    const raw = estimateReference();
    const name = `Fralda ${targetAudience} alvo M 40 unidades`;
    const comparableName = `Fralda ${comparableAudience} comparável M 40 unidades`;
    const packageDescription = "pacote fechado plástico M 40 unidades";
    const target = `${name}; ${packageDescription}.`;
    const evidence = `${comparableName}; ${packageDescription}; peso bruto 350 g; largura 8 cm, altura 20 cm, comprimento 10 cm.`;
    const estimate = { ...raw.estimate, comparableName, packageDescription, productFamily: "fralda", targetEvidence: target, evidence, weight: { value: 350, unit: "g", kind: "gross" } };
    const result = qualifyShippingReference({ ...raw, estimate }, { ...context, name, research: `${target}\n${evidence}` });
    assert.equal(Boolean(result?.estimate), allowed, `${targetAudience} / ${comparableAudience}`);
  }
});

test("estimates separate conservative ranges from sourced comparable facts without changing exact values", () => {
  const result = qualifyShippingReference(estimateReference(), estimateContext)!;
  assert.equal(result.weightGrams, null);
  assert.equal(result.widthCm, null);
  assert.deepEqual(result.estimate?.weightGrams, { min: 280, max: 420 });
  assert.deepEqual(result.estimate?.heightCm, { min: 16, max: 24 });
  assert.equal(result.estimate?.source.evidence, comparableEvidence);
  assert.equal(result.estimate?.confidence, "low");
  assert.equal(result.estimate?.targetSource?.evidence, targetEvidence);
  assert.equal(result.estimate?.productFamily, "perfume");
  assert.equal(result.estimate?.packageMaterial, "plástico");
  assert.match(result.estimate!.assumptions.join(" "), /20%/);
  const partial = qualifyShippingReference({ ...estimateReference(), weight: reference().weight }, estimateContext)!;
  assert.equal(partial.weightGrams, 350);
  assert.equal(partial.estimate?.weightGrams, null);
  assert.equal(partial.estimate?.heightCm?.max, 24);
});

test("comparable estimates reject absent sources, fabricated evidence and unknown or conflicting target presentation", () => {
  for (const patch of [{ sources: [] }, { research: "Sem comparável comprovado." }, { exactIdentity: false }, { name: "Produto sintético" }]) {
    assert.equal(qualifyShippingReference(estimateReference(), { ...estimateContext, ...patch })?.estimate ?? null, null);
  }
  for (const patch of [{ identityMatch: "conflict" }, { identityMatch: "uncertain" }, { packageLevel: "unknown" }]) {
    assert.equal(qualifyShippingReference({ ...estimateReference(), ...patch }, estimateContext)?.estimate ?? null, null);
  }
  const wrongPresentation = { ...estimateReference().estimate, comparableName: "Produto comparável 500 ml" };
  assert.equal(qualifyShippingReference({ ...estimateReference(), estimate: wrongPresentation }, { ...estimateContext, research: comparableEvidence.replaceAll("300 ml", "500 ml") })?.estimate ?? null, null);
});

test("estimate mass still requires gross evidence and dimensions remain independently usable", () => {
  for (const [weightPatch, evidence] of [
    [{ kind: "net" }, comparableEvidence.replace("peso bruto", "peso líquido")],
    [{ kind: "gross" }, comparableEvidence.replace("peso bruto", "peso líquido")],
    [{ unit: "ml" }, comparableEvidence.replace("0,35 kg", "0,35 ml")],
    [{ value: 5 }, comparableEvidence],
  ] as const) {
    const raw = estimateReference();
    const result = qualifyShippingReference({ ...raw, estimate: { ...raw.estimate, evidence, weight: { ...raw.estimate.weight, ...weightPatch } } }, { ...estimateContext, research: `${targetEvidence}\n${evidence}` });
    assert.equal(result?.estimate?.weightGrams ?? null, null);
    assert.equal(result?.estimate?.widthCm?.max, 10);
  }
  const raw = estimateReference();
  const result = qualifyShippingReference({ ...raw, estimate: { ...raw.estimate, dimensions: { ...raw.estimate.dimensions, width: -1 } } }, estimateContext);
  assert.equal(result?.estimate?.widthCm ?? null, null);
  assert.equal(result?.estimate?.weightGrams?.max, 420);
});

test("kit estimates require a comparable complete retail kit and never divide a master case", () => {
  const evidence = "Kit comparável 3 sabonetes; kit fechado papelão 3 sabonetes; peso bruto 350 g; largura 8 cm, altura 20 cm, comprimento 10 cm.";
  const raw = estimateReference();
  const kit = { ...raw, packageLevel: "retail_kit", estimate: { ...raw.estimate, comparableName: "Kit comparável 3 sabonetes", packageDescription: "kit fechado papelão 3 sabonetes", packageLevel: "retail_kit", productFamily: "sabonete", packageMaterial: "papelão", targetEvidence: "Kit sintético 3 sabonetes; kit fechado papelão 3 sabonetes.", evidence, weight: { value: 350, unit: "g", kind: "gross" } } };
  const kitContext = { ...estimateContext, name: "Kit sintético 3 sabonetes", research: `${kit.estimate.targetEvidence}\n${evidence}` };
  assert.equal(qualifyShippingReference(kit, kitContext)?.estimate?.weightGrams?.max, 420);
  assert.equal(qualifyShippingReference({ ...kit, estimate: { ...kit.estimate, packageLevel: "retail_unit" } }, kitContext)?.estimate ?? null, null);
  const masterEvidence = evidence.replace("kit fechado", "caixa master");
  assert.equal(qualifyShippingReference({ ...kit, estimate: { ...kit.estimate, evidence: masterEvidence, packageDescription: "caixa master 3 sabonetes" } }, { ...kitContext, research: masterEvidence })?.estimate ?? null, null);
});

test("estimate ranges reject reversed, narrow and excessive values while old references remain valid", () => {
  const result = qualifyShippingReference(estimateReference(), estimateContext)!;
  const estimate = result.estimate!;
  for (const weightGrams of [{ min: 420, max: 280 }, { min: 350, max: 350 }, { min: 350, max: 351 }, { min: 20000, max: 30001 }]) {
    assert.equal(shippingEstimateSchema.safeParse({ ...estimate, weightGrams }).success, false);
  }
  assert.equal(shippingEstimateSchema.safeParse({ ...estimate, widthCm: { min: 160, max: 240 } }).success, false);
  const oldReference = { ...result };
  delete oldReference.estimate;
  assert.equal(shippingReferenceSchema.safeParse(oldReference).success, true);
  const largeEvidence = comparableEvidence.replace("0,35 kg", "29 kg");
  const raw = estimateReference();
  const limited = qualifyShippingReference({ ...raw, estimate: { ...raw.estimate, evidence: largeEvidence, weight: { value: 29, unit: "kg", kind: "gross" } } }, { ...estimateContext, research: estimateContext.research.replace(comparableEvidence, largeEvidence) });
  assert.equal(limited?.estimate?.weightGrams, null);
  assert.equal(limited?.estimate?.heightCm?.max, 24);
});

test("comparable presentation rejects unknown packaging formats and conflicting formats", () => {
  assert.equal(qualifyShippingReference(estimateReference(), { ...estimateContext, research: `${context.research}\n${comparableEvidence}` })?.estimate ?? null, null);
  assert.equal(qualifyShippingReference(estimateReference(), { ...estimateContext, name: "Produto sintético bisnaga 300 ml" })?.estimate ?? null, null);
  const raw = estimateReference();
  assert.equal(qualifyShippingReference({ ...raw, estimate: { ...raw.estimate, assumptions: [] } }, estimateContext)?.estimate ?? null, null);
});

test("never estimates diapers from wet wipes despite equal count, size and package format", () => {
  const raw = estimateReference();
  const evidence = "Lenços umedecidos M 40 unidades; pacote fechado plástico M 40 unidades; peso bruto 350 g; largura 8 cm, altura 20 cm, comprimento 10 cm.";
  const estimate = { ...raw.estimate, productFamily: "higiene", packageMaterial: "plástico", targetSourceIndex: 0,
    targetEvidence: "Fralda infantil M 40 unidades; pacote fechado plástico M 40 unidades.",
    comparableName: "Lenços umedecidos M 40 unidades", packageDescription: "pacote fechado plástico M 40 unidades", evidence,
    weight: { value: 350, unit: "g", kind: "gross" },
  };
  const result = qualifyShippingReference({ ...raw, estimate }, { ...context, name: "Fralda infantil M 40 unidades", research: `${estimate.targetEvidence}\n${evidence}` });
  assert.equal(result?.estimate ?? null, null);
  assert.equal(qualifyShippingReference({ ...raw, estimate: { ...estimate, productFamily: "fralda" } }, { ...context, name: "Fralda infantil M 40 unidades", research: `${estimate.targetEvidence}\n${evidence}` })?.estimate ?? null, null);
});

test("never estimates glass bottles from plastic bottles with the same perfume volume", () => {
  const raw = estimateReference();
  const evidence = "Perfume comparável 300 ml; frasco fechado plástico 300 ml; peso bruto 350 g; largura 8 cm, altura 20 cm, comprimento 10 cm.";
  const estimate = { ...raw.estimate, productFamily: "perfume", packageMaterial: "plástico", targetSourceIndex: 0,
    targetEvidence: "Perfume alvo 300 ml; frasco fechado vidro 300 ml.",
    comparableName: "Perfume comparável 300 ml", packageDescription: "frasco fechado plástico 300 ml", evidence,
    weight: { value: 350, unit: "g", kind: "gross" },
  };
  const result = qualifyShippingReference({ ...raw, estimate }, { ...context, name: "Perfume alvo 300 ml", research: `${estimate.targetEvidence}\n${evidence}` });
  assert.equal(result?.estimate ?? null, null);
});

test("estimate requires factual target material and source while preserving valid exact shipping facts", () => {
  const raw = estimateReference();
  for (const patch of [{ productFamily: "higiene" }, { packageMaterial: "desconhecido" }, { targetSourceIndex: 7 }, { targetEvidence: "Trecho inventado sobre frasco plástico." }]) {
    const result = qualifyShippingReference({ ...raw, weight: reference().weight, estimate: { ...raw.estimate, ...patch } }, estimateContext);
    assert.equal(result?.estimate ?? null, null);
    assert.equal(result?.weightGrams, 350);
  }
  const noMaterial = targetEvidence.replace(" plástico", "");
  assert.equal(qualifyShippingReference({ ...raw, estimate: { ...raw.estimate, targetEvidence: noMaterial } }, { ...estimateContext, research: estimateContext.research.replace(targetEvidence, noMaterial) })?.estimate ?? null, null);
});

test("comparable estimates follow packaging across medicine, food, diapers, devices and beauty", () => {
  for (const [product, family, presentation, format, material] of [
    ["Comprimidos", "comprimido", "20 comprimidos 500 mg", "caixa", "papelão"],
    ["Chocolate", "chocolate", "100 g", "barra", "plástico"],
    ["Fralda infantil", "fralda", "M 40 unidades", "pacote", "plástico"],
    ["Termômetro", "termômetro", "1 unidade", "estojo", "plástico"],
    ["Perfume", "perfume", "100 ml", "frasco", "vidro"],
  ]) {
    const name = `${product} alvo ${presentation}`;
    const comparableName = `${product} comparável ${presentation}`;
    const packageDescription = `${format} fechado ${material} ${presentation}`;
    const evidence = `${comparableName}; ${packageDescription}; peso bruto 350 g; largura 8 cm, altura 20 cm, comprimento 10 cm.`;
    const raw = estimateReference();
    const estimate = { ...raw.estimate, comparableName, packageDescription, evidence, productFamily: family, packageMaterial: material, targetEvidence: `${name}; ${packageDescription}.`, weight: { value: 350, unit: "g", kind: "gross" } };
    const result = qualifyShippingReference({ ...raw, estimate }, { ...context, name, research: `${name}; ${packageDescription}.\n${evidence}` });
    assert.deepEqual(result?.estimate?.weightGrams, { min: 280, max: 420 }, name);
  }
});

test("converts sourced gross weight and explicit units, preserving evidence", () => {
  const result = qualifyShippingReference(reference(), context)!;
  assert.deepEqual([result.weightGrams, result.widthCm, result.heightCm, result.lengthCm], [350, 8, 20, 10]);
  assert.equal(result.weightSource?.url, context.sources[0].url);
  assert.match(result.warnings.join(" "), /caixa/);
});

test("never turns net contents, baby weight, unknown units or ungrounded values into freight", () => {
  assert.equal(qualifyShippingReference({ ...reference(), weight: { ...reference().weight, kind: "net" } }, context)?.weightGrams, null);
  const invalidWeight = qualifyShippingReference({ ...reference(), weight: { ...reference().weight, unit: "ml" } }, context);
  assert.equal(invalidWeight?.weightGrams, null);
  assert.equal(invalidWeight?.widthCm, 8);
  assert.equal(qualifyShippingReference({ ...reference(), weight: { ...reference().weight, value: 9 } }, context)?.weightGrams, null);
  assert.equal(qualifyShippingReference(reference(), { ...context, research: "Faixa de peso do bebê: 9 kg; pacote M." })?.weightGrams, null);
  const missingSource = qualifyShippingReference(reference(), { ...context, sources: [] });
  assert.equal(missingSource?.weightSource, null); assert.equal(missingSource?.widthCm, null);
  assert.equal(qualifyShippingReference(reference(), { ...context, sources: [{ title: "Inválida", url: "javascript:alert(1)" }] })?.weightGrams, null);
});

test("reads explicit gross package weight with Brazilian thousands and decimal formats", () => {
  for (const [text, value, grams] of [
    ["Peso bruto da unidade: 1.000 g.", 1000, 1000],
    ["Peso do produto embalado: 1.250,5 g.", 1250.5, 1251],
    ["Peso total do pacote fechado: 0,35 kg.", 0.35, 350],
    ["Gross weight of the packaged product: 0.35 kg.", 0.35, 350],
    ["Peso bruto do sabonete líquido: 350 g com embalagem comercial.", 350, 350],
  ] as const) {
    const unit = text.includes("kg") ? "kg" : "g";
    const result = qualifyShippingReference({ ...reference(), weight: { ...reference().weight, value, unit, evidence: text } }, { ...context, research: `${text}\n${evidenceDimensions}` });
    assert.equal(result?.weightGrams, grams, text);
  }
  for (const text of ["Peso líquido da unidade: 350 g.", "Peso total da unidade: 350 g (peso líquido sem embalagem).", "Gross weight: 350 g; net weight is shown.", "Peso da embalagem vazia: 350 g.", "Peso do bebê: 350 g.", "Gross weight: 1.000 g."]) {
    const result = qualifyShippingReference({ ...reference(), weight: { ...reference().weight, value: text.includes("1.000") ? 1000 : 350, unit: "g", evidence: text } }, { ...context, research: text });
    assert.equal(result?.weightGrams, null, text);
  }
});

test("keeps a sourced fact when the other measurement is incomplete or malformed", () => {
  const incomplete = { ...reference().dimensions, height: undefined };
  const result = qualifyShippingReference({ ...reference(), dimensions: incomplete, warnings: ["Fontes divergentes para as medidas.", "a".repeat(500)] }, context);
  assert.equal(result?.weightGrams, 350);
  assert.equal(result?.widthCm, null);
  assert.match(result!.warnings.join(" "), /Dimensões/);
  assert.ok(result!.warnings.includes("Fontes divergentes para as medidas."));
  assert.equal(qualifyShippingReference({ ...reference(), identityMatch: "invented" }, context), null);
});

test("master case, conflicting or uncertain identity never provides applicable values", () => {
  for (const patch of [{ packageLevel: "case" }, { packageLevel: "unknown" }, { identityMatch: "conflict" }, { identityMatch: "uncertain" }]) {
    const result = qualifyShippingReference({ ...reference(), ...patch }, context);
    assert.equal(result?.weightGrams, null); assert.equal(result?.widthCm, null);
  }
  assert.equal(qualifyShippingReference(reference(), { ...context, exactIdentity: false })?.weightGrams, null);
  assert.equal(sameShippingVariant("Fralda linha A M 40 unidades", "Fralda linha A G 40 unidades"), false);
  assert.equal(sameShippingVariant("Fralda RN 20 unidades", "Fralda RN 20 unidades"), true);
  assert.match(shippingResearchInstructions, /mg por comprimido/);
  assert.match(shippingResearchInstructions, /fralda aberta/);
});

test("out of range and mismatched dimensions are omitted, partial valid evidence survives", () => {
  const result = qualifyShippingReference({ ...reference(), dimensions: { ...reference().dimensions, height: 999 } }, context)!;
  assert.equal(result.heightCm, null); assert.equal(result.weightGrams, 350);
  const oversized = qualifyShippingReference({ ...reference(), weight: { ...reference().weight, value: 31, evidence: "Peso bruto: 31 kg com embalagem." } }, { ...context, research: "Peso bruto: 31 kg com embalagem." });
  assert.equal(oversized?.weightGrams, null);
});

test("requires dimensions tied to named axes and their own units", () => {
  for (const text of [
    "Dimensões da unidade: 80 x 200 x 100 mm.",
    "Largura 200 mm, altura 80 mm, comprimento 100 mm.",
    "Largura 80 cm, altura 200 cm, comprimento 100 mm.",
    "Largura 80 mm, altura 200 mm, comprimento 100 mm; largura 90 mm.",
    "Fralda aberta: largura 80 mm, altura 200 mm, comprimento 100 mm.",
    "Caixa master: largura 80 mm, altura 200 mm, comprimento 100 mm.",
  ]) {
    const result = qualifyShippingReference({ ...reference(), dimensions: { ...reference().dimensions, evidence: text } }, { ...context, research: `${evidenceWeight}\n${text}` });
    assert.equal(result?.widthCm, null, text);
    assert.equal(result?.weightGrams, 350, text);
  }
});

test("accepts a shared dimension unit only with an explicit axis order", () => {
  const text = "Dimensões (C x L x A): 100 x 80 x 200 mm da unidade.";
  const result = qualifyShippingReference({ ...reference(), dimensions: { ...reference().dimensions, evidence: text } }, { ...context, research: text });
  assert.deepEqual([result?.lengthCm, result?.widthCm, result?.heightCm], [10, 8, 20]);
  const wrong = text.replace("C x L x A", "A x L x C");
  assert.equal(qualifyShippingReference({ ...reference(), dimensions: { ...reference().dimensions, evidence: wrong } }, { ...context, research: wrong })?.widthCm, null);
});

test("requires the claimed weight number to carry the claimed mass unit", () => {
  const text = "Peso bruto: 0,35 kg; conteúdo: 350 ml.";
  const result = qualifyShippingReference({ ...reference(), weight: { ...reference().weight, value: 350, unit: "kg", evidence: text } }, { ...context, research: text });
  assert.equal(result?.weightGrams, null);
  const count = "Peso bruto: 0,35 kg; kit com 2 unidades.";
  assert.equal(qualifyShippingReference({ ...reference(), weight: { ...reference().weight, value: 2, evidence: count } }, { ...context, research: count })?.weightGrams, null);
});

test("does not reuse an individual reference for a kit or multipack", () => {
  for (const name of ["Kit de 3 sabonetes", "Sabonete multipack 3 unidades", "Combo de 3 sabonetes"]) {
    assert.equal(qualifyShippingReference(reference(), { ...context, name })?.weightGrams, null, name);
  }
  assert.equal(sameShippingVariant("Sabonete 90 g", "Kit sabonete 90 g"), false);
  assert.equal(sameShippingVariant("Kit sabonete 90 g", "Sabonete 90 g"), false);
  const kit = qualifyShippingReference({ ...reference(), packageLevel: "retail_kit" }, { ...context, name: "Kit de 3 sabonetes" });
  assert.equal(kit?.weightGrams, 350);
  assert.equal(kit?.widthCm, 8);
});

test("catalog can save partial drafts but cannot approve a carrier profile", () => {
  const draft = { enabled: false, transportReviewed: false, weightGrams: 350, widthCm: null, heightCm: null, lengthCm: null };
  assert.equal(shippingDraftSchema.safeParse(draft).success, true);
  assert.equal(shippingProfileSchema.safeParse(draft).success, false);
  assert.equal(productCreateSchema.safeParse({ name: "Produto sintético", price: 10, shippingProfile: draft }).success, true);
  assert.equal(productCreateSchema.safeParse({ name: "Produto sintético", price: 10, shippingProfile: { ...draft, enabled: true, transportReviewed: true } }).success, false);
  const product = { id: "fixture", name: "Produto", category: "Higiene", requiresPrescription: false, isPopularPharmacy: false, shippingProfile: draft, updatedAt: new Date() };
  assert.throws(() => validateShippingProduct(product), /não foi liberado/);
  const approved = { enabled: true, transportReviewed: true, weightGrams: 350, widthCm: 8, heightCm: 20, lengthCm: 10 };
  assert.deepEqual(validateShippingProduct({ ...product, category: "Medicamentos", shippingProfile: approved }), { ...approved, measurementBasis: "measured" });
  assert.throws(() => validateShippingProduct({ ...product, requiresPrescription: true, shippingProfile: approved }), /atendimento/);
  const invalidated = invalidateShippingProfile(approved)!;
  assert.equal(invalidated.enabled, false); assert.equal(invalidated.transportReviewed, false);
  assert.equal(invalidated.weightGrams, 350); assert.equal(invalidated.reference, null);
});
