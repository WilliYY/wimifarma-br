import assert from "node:assert/strict";
import test from "node:test";
import { diaperPackageUnitPrice } from "./diaper-unit-price";

const diaper = (name: string) => ({ name, category: "Fraldas infantis", requiresPrescription: false });

test("compara pacotes de 78 e 88 fraldas pelo preço atual em centavos", () => {
  assert.deepEqual(diaperPackageUnitPrice(diaper("Fralda Mili M 78 fraldas"), 11673), { quantity: 78, perDiaperCents: 150 });
  assert.deepEqual(diaperPackageUnitPrice(diaper("Fralda Mili M 88 unidades"), 11798), { quantity: 88, perDiaperCents: 134 });
});

test("aceita quantidade explícita em unidades e tamanho junto da contagem", () => {
  for (const count of ["M78 un", "G 78 und", "78 unid.", "78 unidades", "78 fraldas"]) {
    assert.deepEqual(diaperPackageUnitPrice(diaper(`Fralda sintética ${count}`), 7800), { quantity: 78, perDiaperCents: 100 });
  }
  assert.deepEqual(diaperPackageUnitPrice(diaper("FRALDA GERIÁTRICA M 20 UNIDADES 40 a 70 kg"), 2390), { quantity: 20, perDiaperCents: 120 });
});

test("não transforma tamanho, peso corporal ou números sem unidade em contagem", () => {
  for (const name of ["Fralda Mili M 6 a 11 kg", "Fralda Mili M 78", "Fralda Mili M 78,5 unidades", "Fralda Mili M 0 unidades", "Fralda Mili M 100000 unidades"]) {
    assert.equal(diaperPackageUnitPrice(diaper(name), 11798), null, name);
  }
});

test("omite kits, multiplicadores, contagens conflitantes e brindes", () => {
  for (const name of ["Kit Fralda Mili 2 pacotes 78 unidades", "Fralda Mili 2 x 78 unidades", "Fralda Mili 2 pacotes de 78 unidades", "Fralda Mili 78 unidades + 20 lenços", "Fralda Mili 78 unidades 88 fraldas", "Fralda Mili leve 88 pague 78 unidades"]) {
    assert.equal(diaperPackageUnitPrice(diaper(name), 11798), null, name);
  }
});

test("não anuncia preço por fralda em outros produtos ou medicamentos", () => {
  for (const name of ["Creme para fraldas 20 unidades", "Lenços para troca de fralda 78 unidades", "Sabonete 6 unidades"]) {
    assert.equal(diaperPackageUnitPrice(diaper(name), 11798), null);
  }
  assert.equal(diaperPackageUnitPrice({ ...diaper("Fralda sintética 78 unidades"), catalogClassification: { kind: "MEDICINE", medicineClass: "GENERIC", ethical: false, otc: true } }, 11798), null);
});

test("arredonda somente a informação comparativa e rejeita preços inválidos", () => {
  const product = diaper("Fralda sintética 88 unidades");
  for (const cents of [0, -1, NaN, Infinity, 11798.5, Number.MAX_SAFE_INTEGER + 1, 1]) {
    assert.equal(diaperPackageUnitPrice(product, cents), null, String(cents));
  }
  assert.deepEqual(diaperPackageUnitPrice(product, 8800), { quantity: 88, perDiaperCents: 100 });
  assert.deepEqual(diaperPackageUnitPrice(product, 4400), { quantity: 88, perDiaperCents: 50 });
});
