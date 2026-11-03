import assert from "node:assert/strict";
import test from "node:test";
import { hasPerfumeShippingCargo, permittedShippingServices, requiresPharmacyShippingSupport } from "./eligibility";
import { validateShippingProduct } from "./rules";

const profile = { enabled: true, transportReviewed: true, weightGrams: 200, widthCm: 15, heightCm: 10, lengthCm: 20 };
const product = { id: "synthetic-product", name: "Produto teste", category: null as string | null, requiresPrescription: false, isPopularPharmacy: false, shippingProfile: profile, updatedAt: new Date(0) };

test("antimicrobial checkout does not automatically authorize carrier transport", () => {
  const antimicrobial = { ...product, requiresPrescription: true, prescriptionType: "ANTIMICROBIAL" as const };
  assert.equal(requiresPharmacyShippingSupport(antimicrobial), true);
  assert.throws(() => validateShippingProduct(antimicrobial), /o envio precisa de atendimento da farmácia/);
});

test("prescription and Popular Pharmacy restrictions still require pharmacist support", () => {
  for (const category of ["Farmácia Popular", "FARMACIA POPULAR", "Farma\u0301cia Popular"]) {
    const restricted = { ...product, category };
    assert.equal(requiresPharmacyShippingSupport(restricted), true, category);
    assert.throws(() => validateShippingProduct(restricted), /o envio precisa de atendimento da farmácia/, category);
  }
  for (const restriction of [{ requiresPrescription: true }, { isPopularPharmacy: true }]) {
    const restricted = { ...product, ...restriction };
    assert.equal(requiresPharmacyShippingSupport(restricted), true);
    assert.throws(() => validateShippingProduct(restricted), /o envio precisa de atendimento da farmácia/);
  }
});

test("a classified ordinary prescription can quote shipping but not bypass packaging review", () => {
  const ordinary = { ...product, category: "Medicamentos", requiresPrescription: true, prescriptionType: "ORDINARY" as const };
  assert.equal(requiresPharmacyShippingSupport(ordinary), false);
  assert.deepEqual(validateShippingProduct(ordinary), { ...profile, measurementBasis: "measured" });
  assert.throws(() => validateShippingProduct({ ...ordinary, shippingProfile: { ...profile, transportReviewed: false } }));
  assert.equal(requiresPharmacyShippingSupport({ ...ordinary, prescriptionType: "CONTROLLED" }), true);
  assert.equal(requiresPharmacyShippingSupport({ ...ordinary, prescriptionType: "UNREVIEWED" }), true);
  assert.deepEqual(permittedShippingServices([1, 2, 3], [ordinary]), [1, 2]);
});

test("ordinary medication can ship with reviewed packaging using PAC or SEDEX only", () => {
  for (const category of ["Medicamentos", "MEDICAMENTO", "Médicamentos", "Outros medicamentos"]) {
    const eligible = { ...product, category };
    assert.equal(requiresPharmacyShippingSupport(eligible), false, category);
    assert.deepEqual(validateShippingProduct(eligible), { ...profile, measurementBasis: "measured" });
    assert.throws(() => validateShippingProduct({ ...eligible, shippingProfile: null }), /embalagem estão pendentes/);
    assert.deepEqual(permittedShippingServices([1, 2, 3, 4], [eligible]), [1, 2]);
    assert.deepEqual(permittedShippingServices([3, 4], [eligible]), []);
  }
});

test("mixed medication cart restricts carrier services without mutating configuration", () => {
  const configured = [3, 2, 1];
  assert.deepEqual(permittedShippingServices(configured, [product]), configured);
  assert.deepEqual(permittedShippingServices(configured, [product, { ...product, category: "Medicamentos" }]), [2, 1]);
  assert.deepEqual(configured, [3, 2, 1]);
});

test("explicit prescription markers restrict generic and mixed categories to PAC/SEDEX", () => {
  for (const markers of [
    { requiresPrescription: true, prescriptionType: "ORDINARY" as const },
    { requiresPrescription: false, prescriptionType: "ORDINARY" as const },
    { requiresPrescription: false, prescriptionType: "CONTROLLED" as const },
    { requiresPrescription: true },
    { isPopularPharmacy: true },
  ]) {
    const medicine = { ...product, category: "Saude", ...markers };
    assert.deepEqual(permittedShippingServices([3, 1, 2], [product, medicine]), [1, 2]);
  }
});

test("non-medicine categories do not require pharmacy support but still require approved packaging", () => {
  for (const category of [null, "", "Higiene", "Perfumaria", "Alimentos e chocolates", "Fraldas", "Cosméticos"]) {
    const eligible = { ...product, category };
    assert.equal(requiresPharmacyShippingSupport(eligible), false, String(category));
    assert.deepEqual(validateShippingProduct(eligible), { ...profile, measurementBasis: "measured" });
    assert.throws(() => validateShippingProduct({ ...eligible, shippingProfile: null }), /embalagem estão pendentes/);
  }
});

test("carrier approval intersects every product, medication policy and global configuration", () => {
  const configured = [1, 2, 3, 12, 35];
  const approved = (ids: number[]) => ({ ...product, shippingProfile: { ...profile, approvedServiceIds: ids } });
  assert.deepEqual(permittedShippingServices(configured, [product]), configured, "legacy profile preserves configuration");
  assert.deepEqual(permittedShippingServices(configured, [approved([1, 3, 35]), approved([2, 3, 12])]), [3]);
  assert.deepEqual(permittedShippingServices(configured, [product, approved([1, 35])]), [1, 35]);
  assert.deepEqual(permittedShippingServices(configured, [approved([])]), [], "explicit empty approval never expands");
  assert.deepEqual(permittedShippingServices(configured, [{ ...approved([1, 3]), category: "Medicamentos" }]), [1]);
  assert.deepEqual(configured, [1, 2, 3, 12, 35]);
});

test("cargo restrictions cannot be overridden by carrier approval or general flags", () => {
  const perfume = { ...product, name: "Perfume sintético", shippingProfile: { ...profile, approvedServiceIds: [1, 3, 22, 33, 999], cargoKinds: ["general"] } };
  assert.deepEqual(permittedShippingServices([1, 3, 22, 33, 999], [perfume]), [3, 22, 33]);
  assert.deepEqual(permittedShippingServices([1, 3, 22, 33], [perfume, { ...product, catalogClassification: { kind: "MEDICINE" } }]), []);
  assert.deepEqual(permittedShippingServices([1, 3], [{ ...product, shippingProfile: { ...profile, cargoKinds: ["temperature_sensitive"] } }]), []);
});

test("dry absorbent scent qualifiers preserve services without clearing explicit perfume cargo", () => {
  for (const name of ["Absorvente Always Diários Com Perfume 40 unidades", "Absorvente Always Sem Perfume 80 unidades", "Absorvente Carefree Proteção Com Perfume 15Un", "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 15 unidades", "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 40 unidades", "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 80 unidades"]) {
    assert.deepEqual(permittedShippingServices([1, 3], [{ ...product, name }]), [1, 3], name);
  }
  for (const name of ["Absorvente com perfume", "Absorvente perfume 40 unidades", "Absorvente com perfume spray 40 unidades", "Absorvente com perfume líquido 40 unidades", "Absorvente com perfume 100ml 40 unidades", "Absorvente com perfume aerossol 40 unidades", "Absorvente com perfume 40 unidades + eau de toilette"]) {
    assert.deepEqual(permittedShippingServices([1, 3], [{ ...product, name }]), [3], name);
  }
  const absorbent = { ...product, name: "Absorvente sem perfume 40 unidades" };
  assert.deepEqual(permittedShippingServices([1, 3], [{ ...absorbent, shippingProfile: { ...profile, cargoKinds: ["perfume"], approvedServiceIds: [1, 3] } }]), [3]);
  assert.deepEqual(permittedShippingServices([1, 3], [{ ...absorbent, shippingProfile: { ...profile, cargoKinds: ["general"], approvedServiceIds: [3] } }]), [3]);
});

test("electrical and battery markers cannot use the dry absorbent scent exception", () => {
  for (const marker of ["elétrico", "eletrico", "electric", "bateria", "pilha", "recarregável"]) {
    const name = `Absorvente com perfume ${marker} 40 unidades`;
    assert.deepEqual(permittedShippingServices([1, 3], [{ ...product, name }]), [3], name);
  }
});

test("wet absorbents cannot use the dry absorbent scent exception", () => {
  for (const marker of ["umedecido", "umidificado"]) {
    const name = `Absorvente ${marker} com perfume 40 unidades`;
    assert.deepEqual(permittedShippingServices([1, 3], [{ ...product, name }]), [3], name);
  }
});

test("structured medicine closes free-category bypass while generic perfumery stays eligible", () => {
  assert.deepEqual(permittedShippingServices([1, 2, 3, 12, 22], [{ ...product, category: "Outros", catalogClassification: { kind: "MEDICINE" } }]), [1, 2]);
  assert.deepEqual(permittedShippingServices([1, 3, 31], [{ ...product, name: "Spray nasal sintético", category: "Perfumaria" }]), [1, 3, 31]);
  assert.deepEqual(permittedShippingServices([1, 3, 31], [{ ...product, name: "Desodorante aerossol sintético" }]), [3]);
});

test("explicit dry cosmetic powder scent qualifiers preserve services and existing cargo restrictions", () => {
  for (const name of ["Desodorante para pés Tenys Pé Baruel Sem Perfume em pó 100g", "Talco cosmético com perfume 100 g", "Talco cosmético sem perfume 1 kg"]) {
    assert.equal(hasPerfumeShippingCargo(name), false, name);
    const row = { ...product, name }, before = structuredClone(row);
    assert.deepEqual(permittedShippingServices([1, 2, 3, 31], [row]), [1, 2, 3, 31], name);
    assert.deepEqual(row, before);
    assert.deepEqual(permittedShippingServices([1, 3], [{ ...row, shippingProfile: { ...profile, cargoKinds: ["perfume"] } }]), [3]);
    assert.deepEqual(permittedShippingServices([1, 3], [{ ...row, shippingProfile: { ...profile, approvedServiceIds: [3] } }]), [3]);
  }
  for (const name of ["Talco com perfume", "Desodorante para pés sem perfume 100g", "Pó sem perfume 100g", "Talco perfume 100g", "Talco com perfume + perfume 100g", "Kit talco com perfume 100g"]) {
    assert.equal(hasPerfumeShippingCargo(name), true, name);
  }
  for (const marker of ["líquido", "creme", "cremoso", "cremosa", "em pasta", "pastoso", "pastosa", "oleoso", "oleosa", "oleosos", "oleosas", "óleo", "spray", "aerossol", "álcool", "solvente", "elétrico", "bateria", "pilha", "recarregável", "umedecido", "100ml", "eau de toilette", "body splash"]) {
    const name = `Talco com perfume ${marker} 100g`;
    assert.equal(hasPerfumeShippingCargo(name), true, name);
    assert.deepEqual(permittedShippingServices([1, 3], [{ ...product, name }]), [3], name);
  }
});
