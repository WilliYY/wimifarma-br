import assert from "node:assert/strict";
import test from "node:test";
import { frenetCheckoutServices, getFrenetCheckoutConfig, quoteFrenetCheckout } from "./frenet-checkout";
import type { PackingRequest } from "./packing";
import { defaultShippingSettings, ShippingError } from "./schema";

const credentials = {
  FRENET_API_TOKEN: "checkout-fixture",
  FRENET_PARTNER_TOKEN: "partner-fixture",
  FRENET_CHECKOUT_ENABLED: "true",
};
const settings = { ...defaultShippingSettings, enabled: true, serviceIds: [1, 2] };
const profile = {
  enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1, 2],
  weightGrams: 880, widthCm: 15, heightCm: 10, lengthCm: 24,
  frenetAcceptance: { version: 1, serviceCodes: ["03298", "03220"] },
};
const product = { name: "Sabonete em barra", category: "Higiene", requiresPrescription: false, isPopularPharmacy: false, shippingProfile: profile };
const packing: PackingRequest = {
  inputMeasurementBasis: "estimated",
  products: [
    { id: "b", quantity: 2, width: 15, height: 10, length: 24, weight: 0.88, insurance_value: 15.95 },
    { id: "a", quantity: 1, width: 17.4, height: 7.1, length: 10.3, weight: 0.412, insurance_value: 8.1 },
  ],
};

test("Frenet checkout requires an explicit flag and both valid server credentials", () => {
  assert.equal(getFrenetCheckoutConfig({}), null);
  assert.equal(getFrenetCheckoutConfig({ ...credentials, FRENET_CHECKOUT_ENABLED: "false" }), null);
  assert.equal(getFrenetCheckoutConfig({ ...credentials, FRENET_PARTNER_TOKEN: undefined }), null);
  assert.equal(getFrenetCheckoutConfig({ ...credentials, FRENET_API_TOKEN: "bad\ncredential" }), null);
  assert.deepEqual(getFrenetCheckoutConfig(credentials), { token: "checkout-fixture", partnerToken: "partner-fixture" });
});

test("Frenet intersects its explicit service approvals for every product at the Ivaté origin", () => {
  const second = { ...product, shippingProfile: { ...profile, approvedServiceIds: [], frenetAcceptance: { version: 1, serviceCodes: ["03220"] } } };
  assert.deepEqual(frenetCheckoutServices(settings, [product, second]), ["03220"]);
  assert.deepEqual(frenetCheckoutServices({ ...settings, serviceIds: [] }, [product]), ["03298", "03220"]);
  assert.deepEqual(frenetCheckoutServices({ ...settings, originPostalCode: "87485000" }, [product]), []);
  assert.deepEqual(frenetCheckoutServices({ ...settings, originCity: "Douradina" }, [product]), []);
  assert.deepEqual(frenetCheckoutServices({ ...settings, environment: "sandbox" }, [product]), []);
  assert.deepEqual(frenetCheckoutServices(settings, []), []);
  for (const frenetAcceptance of [undefined, { version: 2, serviceCodes: ["03298"] }, { version: 1, serviceCodes: ["03298", "03298"] }, { version: 1, serviceCodes: [1, 2] }]) {
    assert.deepEqual(frenetCheckoutServices(settings, [{ ...product, shippingProfile: { ...profile, frenetAcceptance } }]), []);
  }
  assert.deepEqual(frenetCheckoutServices(settings, [{ ...product, shippingProfile: { ...profile, transportReviewed: false } }]), []);
});

test("Frenet keeps restricted cargo and pharmaceutical checkout rules independent of a product approval", () => {
  const liquid = { ...product, name: "Shampoo 200 ml", shippingProfile: { ...profile, cargoKinds: ["liquid"] } };
  assert.deepEqual(frenetCheckoutServices(settings, [liquid]), ["03298", "03220"]);
  assert.deepEqual(frenetCheckoutServices(settings, [{ ...liquid, name: "Enxaguante bucal sem álcool 500 ml" }]), ["03298", "03220"]);
  assert.deepEqual(frenetCheckoutServices(settings, [{ ...liquid, shippingProfile: profile }]), []);
  assert.deepEqual(frenetCheckoutServices(settings, [{ ...product, name: "Shampoo sólido em barra 60 g" }]), ["03298", "03220"]);
  const medicine = { ...product, name: "Medicamento comum", category: "Medicamentos", catalogClassification: { kind: "MEDICINE" } };
  assert.deepEqual(frenetCheckoutServices(settings, [medicine]), []);
  const common = { ...medicine, shippingProfile: { ...profile, cargoKinds: ["medication"] } };
  assert.deepEqual(frenetCheckoutServices(settings, [common]), ["03298", "03220"]);
  assert.deepEqual(frenetCheckoutServices(settings, [{ ...common, requiresPrescription: true }]), []);
  assert.deepEqual(frenetCheckoutServices(settings, [{ ...common, isPopularPharmacy: true }]), []);
  for (const name of ["Desodorante aerossol", "Produto inflamável", "Aparelho com bateria", "Perfume em frasco", "Produto refrigerado"]) {
    assert.deepEqual(frenetCheckoutServices(settings, [{ ...product, name }]), []);
  }
  for (const cargo of ["temperature_sensitive", "perishable", "aerosol", "perfume", "battery", "unspecified"]) {
    assert.deepEqual(frenetCheckoutServices(settings, [{ ...product, shippingProfile: { ...profile, cargoKinds: ["general", cargo] } }]), []);
  }
});

test("Frenet quotes one protected parcel and keeps only approved services with their official codes", async () => {
  const calls: unknown[] = [];
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, "https://whitelabel.frenet.com.br/v1/quotes");
    assert.equal(init?.method, "POST");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("token"), "checkout-fixture");
    assert.equal(headers.get("x-partner-token"), "partner-fixture");
    calls.push(JSON.parse(String(init?.body)));
    return Response.json({ sessionId: "synthetic-session", quotations: [
      { carrierCode: "COR", shippingServiceCode: 3298, shippingPrice: 12.41, deliveryTime: 8 },
      { carrierCode: "COR", shippingServiceCode: "03220", shippingPrice: 17.37, deliveryTime: 4 },
    ] });
  };
  const quotes = await quoteFrenetCheckout(getFrenetCheckoutConfig(credentials)!, "01001000", packing, ["03220"], 2, request);
  assert.deepEqual(calls, [{
    SenderZipCode: "87525000", RecipientZipCode: "01001000", RecipientCountry: "BR", ShipmentItemValue: 40,
    Services: { DeclaredValue: false, ReceiptNotification: false, OwnHand: false },
    Volumes: [{ Weight: 2.172, Length: 24, Width: 18, Height: 28 }],
  }]);
  assert.deepEqual(quotes, [{
    provider: "frenet", serviceId: 3220, providerServiceCode: "03220",
    carrier: "Correios", service: "SEDEX", priceCents: 1737, deliveryDays: 6,
    packaging: { version: 1, inputMeasurementBasis: "estimated", calculationMethod: "provider-conservative-envelope", packages: [{
      weightGrams: 2172, lengthCm: 24, widthCm: 18, heightCm: 28, insuranceValueCents: 0,
      items: [{ productId: "a", quantity: 1 }, { productId: "b", quantity: 2 }],
    }] },
  }]);
});

test("Frenet skips impossible packages and reports a safe provider failure", async () => {
  const config = getFrenetCheckoutConfig(credentials)!;
  const unexpected: typeof fetch = async () => assert.fail("requests for invalid packages and excluded services");
  assert.deepEqual(await quoteFrenetCheckout(config, "01001000", packing, [], 0, unexpected), []);
  for (const oversized of [{ weight: 30.01 }, { width: 100.1 }, { width: 80, length: 90, height: 70 }, { insurance_value: 100001 }]) {
    const item = { ...packing.products[0], ...oversized };
    assert.deepEqual(await quoteFrenetCheckout(config, "01001000", { ...packing, products: [item] }, ["03298"], 0, unexpected), []);
  }
  await assert.rejects(
    quoteFrenetCheckout(config, "01001000", packing, ["03298"], 0,
      async () => new Response("checkout-fixture", { status: 403 })),
    error => error instanceof ShippingError && error.status === 503 && !error.message.includes("checkout-fixture"),
  );
});

test("Frenet applies the contract box minimums without increasing the declared value", async () => {
  const config = getFrenetCheckoutConfig(credentials)!;
  const product = { id: "small", quantity: 1, width: 6, height: 1, length: 10, weight: 0.05, insurance_value: 7.9 };
  let called = false;
  const quotes = await quoteFrenetCheckout(config, "01001000", { ...packing, products: [product] }, ["03298"], 0, async (_url, init) => {
    called = true;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.ShipmentItemValue, 7.9);
    assert.deepEqual(body.Volumes, [{ Length: 16, Width: 11, Height: 2, Weight: 0.05 }]);
    return Response.json({ sessionId: "fixture", quotations: [
      { carrierCode: "COR", shippingServiceCode: "03298", shippingPrice: 12.41, deliveryTime: 8 },
    ] });
  });
  assert.equal(called, true);
  assert.equal(quotes[0].packaging?.packages[0].insuranceValueCents, 0);
});
