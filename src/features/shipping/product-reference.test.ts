import assert from "node:assert/strict";
import test from "node:test";
import { qualifyShippingReference, sameShippingVariant, shippingResearchInstructions } from "./product-reference";
import { shippingDraftSchema, invalidateShippingProfile } from "./product-draft";
import { shippingProfileSchema } from "./schema";
import { validateShippingProduct } from "./rules";
import { productCreateSchema } from "../products/schema";

const evidenceWeight = "Peso bruto da unidade: 0,35 kg com embalagem comercial.";
const evidenceDimensions = "Largura 80 mm, altura 200 mm, comprimento 100 mm da unidade.";
const reference = () => ({ identityMatch: "exact", packageLevel: "retail_unit", weight: { value: 0.35, unit: "kg", kind: "gross", sourceIndex: 0, evidence: evidenceWeight }, dimensions: { width: 80, height: 200, length: 100, unit: "mm", sourceIndex: 0, evidence: evidenceDimensions }, warnings: [] });
const context = { name: "Produto sintético 300 ml", exactIdentity: true, research: `${evidenceWeight}\n${evidenceDimensions}`, sources: [{ title: "Ficha técnica sintética", url: "https://example.com/produto" }] };

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
  assert.deepEqual(validateShippingProduct({ ...product, category: "Medicamentos", shippingProfile: approved }), approved);
  assert.throws(() => validateShippingProduct({ ...product, requiresPrescription: true, shippingProfile: approved }), /atendimento/);
  const invalidated = invalidateShippingProfile(approved)!;
  assert.equal(invalidated.enabled, false); assert.equal(invalidated.transportReviewed, false);
  assert.equal(invalidated.weightGrams, 350); assert.equal(invalidated.reference, null);
});
