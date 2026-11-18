import assert from "node:assert/strict";
import test from "node:test";
import { compareCorreios, correiosCheckoutEligible, getCorreiosCheckoutConfig, quoteCorreiosCheckout } from "./correios-checkout";
import { defaultShippingSettings, ShippingError, shippingProfileSchema, shippingQuotePayloadSchema } from "./schema";

const settings = { ...defaultShippingSettings, enabled: true, serviceIds: [] };
const product = { name: "Fralda sintética 20 unidades", category: "Higiene", requiresPrescription: false, isPopularPharmacy: false,
  shippingProfile: { enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1], weightGrams: 300, widthCm: 15, heightCm: 5, lengthCm: 20 } };
test("direct approval is independent, service-specific and permits ordinary medicines and reviewed liquids", () => {
  const approved = { ...product.shippingProfile, approvedServiceIds: [], approvedCorreiosServiceCodes: ["03298"] };
  for (const medicine of [
    { requiresPrescription: false, prescriptionType: "UNREVIEWED" as const },
    { requiresPrescription: true, prescriptionType: "ORDINARY" as const },
  ]) {
    const item = { ...product, ...medicine, name: "Medicamento sintético solução 20ml", category: "Medicamentos", catalogClassification: { kind: "MEDICINE" },
      shippingProfile: { ...approved, cargoKinds: ["medication", "liquid"] } };
    assert.equal(correiosCheckoutEligible(settings, [item], "03298"), true);
    assert.equal(correiosCheckoutEligible(settings, [item, { ...product, shippingProfile: approved }], "03298"), true, "mixed liquid medicine and dry cargo share the approved code");
    assert.equal(correiosCheckoutEligible(settings, [item], "03220"), false);
    for (const prescriptionType of ["CONTROLLED", "ANTIMICROBIAL", "UNREVIEWED"] as const) {
      assert.equal(correiosCheckoutEligible(settings, [{ ...item, requiresPrescription: true, prescriptionType }]), false);
    }
    assert.equal(correiosCheckoutEligible(settings, [{ ...item, isPopularPharmacy: true }]), false);
  }
  assert.equal(correiosCheckoutEligible(settings, [{ ...product, shippingProfile: approved }], "03298"), true);
  assert.equal(correiosCheckoutEligible(settings, [{ ...product, shippingProfile: { ...approved, approvedCorreiosServiceCodes: [] } }]), false);
  assert.equal(correiosCheckoutEligible(settings, [product], "03220"), true, "legacy dry profiles keep existing behavior");
  assert.equal(correiosCheckoutEligible(settings, [
    { ...product, shippingProfile: approved },
    { ...product, shippingProfile: { ...approved, approvedCorreiosServiceCodes: ["03220"] } },
  ]), false, "cart requires one code approved for every product");
  assert.equal(shippingProfileSchema.safeParse({ ...approved, approvedCorreiosServiceCodes: ["03298", "03298"] }).success, false);
  assert.equal(shippingProfileSchema.safeParse({ ...approved, approvedCorreiosServiceCodes: ["1"] }).success, false);
});

test("specific direct approval preserves dangerous and unclassified cargo blocks", () => {
  const approved = { ...product.shippingProfile, approvedCorreiosServiceCodes: ["03298", "03220"] };
  for (const cargo of ["aerosol", "perishable", "temperature_sensitive", "unspecified"]) {
    assert.equal(correiosCheckoutEligible(settings, [{ ...product, shippingProfile: { ...approved, cargoKinds: [cargo] } }]), false, cargo);
  }
  for (const name of ["Acetona", "Éter", "Formol", "Álcool gel", "Álcool etílico", "Solvente", "Removedor", "Inflamável", "Aerossol", "Pilha", "Bateria", "Aparelho elétrico", "Produto refrigerado"]) {
    assert.equal(correiosCheckoutEligible(settings, [{ ...product, name, shippingProfile: approved }]), false, name);
  }
  for (const name of ["Creme sintético 50g", "Perfume sem álcool 50ml", "Colônia zero álcool 100ml", "Xampu sintético 200ml"]) {
    assert.equal(correiosCheckoutEligible(settings, [{ ...product, name, shippingProfile: { ...approved, cargoKinds: ["liquid", "perfume"] } }]), true, name);
  }
});
test("direct Correios requires opt-in and independent reviewed cargo", () => {
  assert.equal(getCorreiosCheckoutConfig({ CORREIOS_DELEGATED_ACCESS_KEY: "synthetic-key" }), null);
  assert.ok(getCorreiosCheckoutConfig({ CORREIOS_CHECKOUT_ENABLED: "true", CORREIOS_DELEGATED_ACCESS_KEY: "synthetic-key" }));
  assert.equal(correiosCheckoutEligible(settings, [product]), true);
  assert.equal(correiosCheckoutEligible(settings, [{ ...product, shippingProfile: { ...product.shippingProfile, approvedServiceIds: [] } }]), false);
  for (const name of ["Medicamento sintético 20mg", "Xarope sintético", "Solução 20ml", "Perfume", "Aerossol", "Pilha", "Bateria", "Produto refrigerado", "Álcool gel"]) {
    assert.equal(correiosCheckoutEligible(settings, [{ ...product, name }]), false, name);
  }
  for (const cargo of ["liquid", "medication", "unspecified", "aerosol", "perishable", "temperature_sensitive"]) {
    assert.equal(correiosCheckoutEligible(settings, [{ ...product, shippingProfile: { ...product.shippingProfile, cargoKinds: [cargo] } }]), false, cargo);
  }
  assert.equal(correiosCheckoutEligible(settings, [{ ...product, requiresPrescription: true }]), false);
  assert.equal(correiosCheckoutEligible(settings, [{ ...product, shippingProfile: { ...product.shippingProfile, transportReviewed: false } }]), false);
});

test("direct quote preserves the protected stack and declares the full products value", async () => {
  const config = getCorreiosCheckoutConfig({ CORREIOS_CHECKOUT_ENABLED: "true", CORREIOS_DELEGATED_ACCESS_KEY: "synthetic-key" })!;
  const packing = { inputMeasurementBasis: "estimated" as const, products: [{ id: "synthetic", width: 17.1, height: 4.2, length: 28.2, weight: .301, insurance_value: 50, quantity: 2 }] };
  const calls: URL[] = [];
  let omitInsurance = false;
  const request = (async (url: URL) => {
    calls.push(url);
    const code = url.pathname.split("/").at(-1)!;
    const insuranceCode = code === "03298" ? "064" : "019";
    if (url.pathname.includes("servicos-adicionais")) return Response.json([{ codigo: insuranceCode, vlMinDeclarado: 25.63, vlMaxDeclarado: 4668.29 }]);
    if (url.pathname.startsWith("/prazo/")) return Response.json({ coProduto: code, prazoEntrega: 3, entregaDomiciliar: "S" });
    return Response.json({ coProduto: code, pcFinal: "20,74", servicoAdicional: omitInsurance ? [] : [{ coServAdicional: insuranceCode, pcServicoAdicional: "0,74" }] });
  }) as unknown as typeof fetch;
  const options = await quoteCorreiosCheckout(config, "01001000", packing, 2, request);
  assert.equal(options.length, 2);
  assert.equal(options[0].deliveryDays, 5);
  assert.deepEqual(options[0].packaging?.packages[0], { weightGrams: 602, widthCm: 18, heightCm: 9, lengthCm: 29, insuranceValueCents: 10000, items: [{ productId: "synthetic", quantity: 2 }] });
  for (const url of calls.filter(url => url.pathname.includes("/nacional/") && url.pathname.startsWith("/preco/"))) {
    assert.equal(url.searchParams.get("vlDeclarado"), "100.00");
    assert.equal(url.searchParams.get("servicosAdicionais"), url.pathname.endsWith("03298") ? "064" : "019");
  }
  calls.length = 0;
  const pac = await quoteCorreiosCheckout(config, "01001000", packing, 2, request, ["03298"]);
  assert.deepEqual(pac.map(option => option.serviceCode), ["03298"]);
  assert.equal(calls.length, 3);
  assert.equal(calls.every(url => url.pathname.endsWith("03298")), true, "unapproved code never reaches CWS");
  const pacCalls = calls.length;
  assert.deepEqual(await quoteCorreiosCheckout(config, "01001000", packing, 2, request, []), []);
  assert.equal(calls.length, pacCalls, "empty approval never reaches CWS");
  const before = calls.length;
  assert.deepEqual(await quoteCorreiosCheckout(config, "01001000", { ...packing, products: [{ ...packing.products[0], height: 100 }] }, 2, request), []);
  assert.equal(calls.length, before, "oversize stack never requests a quote");
  omitInsurance = true;
  await assert.rejects(quoteCorreiosCheckout(config, "01001000", packing, 2, request), /confirmar a cotação/);
  omitInsurance = false;
  assert.deepEqual(await quoteCorreiosCheckout(config, "01001000", { ...packing, products: [{ ...packing.products[0], insurance_value: 2500 }] }, 2, request), [], "declared value above provider limit cannot be clamped");
});
test("provider aggregation preserves valid channels and unexpected failures", async () => {
  const direct = [{ provider: "correios" as const, serviceId: 3298, serviceCode: "03298" as const, carrier: "Correios", service: "PAC", priceCents: 1000, deliveryDays: 4 }];
  assert.equal((await compareCorreios(Promise.reject(new ShippingError("ME unavailable", 503)), Promise.resolve(direct))).correiosOptions.length, 1);
  assert.equal((await compareCorreios(Promise.resolve(direct), Promise.reject(new ShippingError("Correios unavailable", 503)))).primaryOptions.length, 1);
  await assert.rejects(compareCorreios(Promise.reject(new Error("bug")), Promise.resolve(direct)), /bug/);
});
test("signed direct service identity preserves leading zeros and rejects collisions", () => {
  const payload = { provider: "correios", serviceId: 3298, serviceCode: "03298", carrier: "Correios", service: "PAC", priceCents: 1000, deliveryDays: 4, postalCode: "01001000", fingerprint: "a".repeat(64), revision: 1, expiresAt: Date.now() + 1000 };
  assert.equal(shippingQuotePayloadSchema.safeParse(payload).success, true);
  for (const changed of [{ serviceId: 1 }, { serviceCode: "03220" }, { serviceCode: undefined }, { provider: "melhor-envio" }]) {
    assert.equal(shippingQuotePayloadSchema.safeParse({ ...payload, ...changed }).success, false);
  }
});
