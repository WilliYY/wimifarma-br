import assert from "node:assert/strict";
import test from "node:test";
import { compareSuperFrete, getSuperFreteConfig, quoteSuperFrete, superFreteServices } from "./superfrete";
import { defaultShippingSettings, ShippingError, type ShippingOption } from "./schema";

const env = { SUPERFRETE_API_TOKEN: "fixture-token", SUPERFRETE_ENABLED: "true" };
const settings = { ...defaultShippingSettings, enabled: true, serviceIds: [1, 2, 3], contactEmail: "shipping@example.invalid" };
const cart = { inputMeasurementBasis: "estimated" as const, products: [{ id: "box", quantity: 2,
  insurance_value: 25, width: 12, height: 8, length: 20, weight: 0.25 }] };
const row = (id: number, price: number, has_error = false) => ({ id, price, currency: "R$", has_error,
  delivery_time: 4, delivery_range: { min: 3, max: 5 }, company: { id: 1 },
  packages: [{ dimensions: { height: "16", width: "12", length: "20" }, weight: "0.5", insurance_value: 50 }] });
const product = { name: "Sabonete em barra", category: "Higiene", requiresPrescription: false, isPopularPharmacy: false,
  shippingProfile: { enabled: true, transportReviewed: true, cargoKinds: ["general"], weightGrams: 250, widthCm: 12, heightCm: 8, lengthCm: 20 } };

test("SuperFrete requires an enabled server token and selects only approved PAC/SEDEX in Ivaté", () => {
  assert.equal(getSuperFreteConfig({ SUPERFRETE_API_TOKEN: env.SUPERFRETE_API_TOKEN }), null);
  assert.equal(getSuperFreteConfig({ ...env, SUPERFRETE_API_TOKEN: "token\nsecond" }), null);
  assert.deepEqual(superFreteServices(settings, [1, 2, 3], [product]), [1, 2]);
  assert.deepEqual(superFreteServices(settings, [1, 2], [{ ...product, category: "Medicamentos" }]), []);
  assert.deepEqual(superFreteServices(settings, [1, 2], [{ ...product, category: "Farmácia" }]), []);
  assert.deepEqual(superFreteServices(settings, [1, 2], [{ ...product, shippingProfile: { ...product.shippingProfile, cargoKinds: ["aerosol"] } }]), []);
  assert.deepEqual(superFreteServices({ ...settings, originPostalCode: "87485000" }, [1, 2], [product]), []);
  assert.deepEqual(superFreteServices({ ...settings, postingLocations: [{ serviceId: 1, city: "Umuarama", state: "PR" }] }, [1, 2], [product]), [2]);
});

test("SuperFrete quotes a protected parcel, preserves declared value, and filters outside services", async () => {
  const request = async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(url), "https://api.superfrete.com/api/v0/calculator");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fixture-token");
    assert.deepEqual(JSON.parse(String(init?.body)), { from: { postal_code: "87525000" }, to: { postal_code: "01001000" },
      services: "1,2", options: { own_hand: false, receipt: false, insurance_value: 50, use_insurance_value: true },
      package: { weight: 0.5, width: 12, height: 16, length: 20 } });
    return Response.json([row(1, 11.08), row(2, 13.95, true), row(31, 1.99)]);
  };
  const quotes = await quoteSuperFrete(getSuperFreteConfig(env)!, settings, "01001000", cart, [1, 2], 1, request);
  assert.deepEqual(quotes.map(({ provider, serviceId, priceCents, deliveryDays }) => ({ provider, serviceId, priceCents, deliveryDays })),
    [{ provider: "superfrete", serviceId: 1, priceCents: 1108, deliveryDays: 6 }]);
  assert.deepEqual(quotes[0].packaging?.packages[0].items, [{ productId: "box", quantity: 2 }]);
});

test("SuperFrete rejects reduced packaging and redacts provider failures", async () => {
  const config = getSuperFreteConfig(env)!;
  const smaller = { ...row(1, 11.08), packages: [{ ...row(1, 11.08).packages[0], weight: "0.01" }] };
  await assert.rejects(quoteSuperFrete(config, settings, "01001000", cart, [1], 1, async () => Response.json([smaller])), /SuperFrete/);
  await assert.rejects(quoteSuperFrete(config, settings, "01001000", cart, [1], 1,
    async () => Response.json({ token: env.SUPERFRETE_API_TOKEN }, { status: 401 })), (error: Error) =>
    /SuperFrete/.test(error.message) && !error.message.includes(env.SUPERFRETE_API_TOKEN));
});

test("a failed provider leaves the other valid quote available", async () => {
  const melhor: ShippingOption = { provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC", priceCents: 1800, deliveryDays: 7 };
  const superfrete = { ...melhor, provider: "superfrete" as const, priceCents: 1108 };
  const unavailable = () => Promise.reject(new ShippingError("Temporariamente indisponível.", 503));
  assert.deepEqual(await compareSuperFrete(Promise.resolve([melhor]), unavailable()), { melhorOptions: [melhor], superFreteOptions: [] });
  assert.deepEqual(await compareSuperFrete(unavailable(), Promise.resolve([superfrete])), { melhorOptions: [], superFreteOptions: [superfrete] });
  await assert.rejects(compareSuperFrete(Promise.resolve([]), unavailable()), /Temporariamente indisponível/);
});
