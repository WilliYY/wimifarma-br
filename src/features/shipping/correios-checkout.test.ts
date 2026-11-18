import assert from "node:assert/strict";
import test from "node:test";
import { compareCorreios, correiosCheckoutEligible, getCorreiosCheckoutConfig, quoteCorreiosCheckout } from "./correios-checkout";
import { defaultShippingSettings, ShippingError, shippingQuotePayloadSchema } from "./schema";

const settings = { ...defaultShippingSettings, enabled: true, serviceIds: [] };
const product = { name: "Fralda sintética 20 unidades", category: "Higiene", requiresPrescription: false, isPopularPharmacy: false,
  shippingProfile: { enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1], weightGrams: 300, widthCm: 15, heightCm: 5, lengthCm: 20 } };
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
