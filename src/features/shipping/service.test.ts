import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { defaultShippingSettings, type ShippingSelection } from "./schema";
import { shippingFingerprint, signShippingQuote } from "./rules";
import { checkoutRequestSchema, type CheckoutRequest } from "@/features/orders/checkout";

test("medication carrier acceptance is enforced both when quoting and submitting a signed quote", async () => {
  const bundle = await build({ entryPoints: ["src/features/shipping/service.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "isolated-shipping-service", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^\.\/integration$|^\.\/provider$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma")
      ? "export const getPrisma=()=>globalThis.fixture.tx;"
      : args.path.endsWith("integration")
        ? "export const readShippingIntegration=async()=>globalThis.fixture.integration;export const shippingAccessToken=async()=> 'synthetic-token';export const SHIPPING_INTEGRATION_ID='synthetic-integration';"
        : "export const melhorEnvioRequest=async(...args)=>globalThis.fixture.provider(...args);" }));
  } }] });
  const key = "synthetic-shipping-service-key";
  const profile = { enabled: true, transportReviewed: true, weightGrams: 350, widthCm: 15, heightCm: 10, lengthCm: 20 };
  const baseProduct = { id: "fixture-product", name: "Produto sintético", slug: "fixture", imageUrl: null, category: "Medicamentos", price: "10.00", promotionalPrice: null, status: "ACTIVE" as const, stock: 10, requiresPrescription: false, isPopularPharmacy: false, shippingProfile: profile, updatedAt: new Date(0) };
  let products = [baseProduct];
  const integration = { settings: { ...defaultShippingSettings, enabled: true, serviceIds: [1, 2, 3], contactEmail: "shipping@example.invalid" }, revision: 7 };
  const requests: { services: string; volumes: { weight: number }[] }[] = [];
  const tx = { product: { findMany: async () => products }, shippingIntegration: { findUnique: async () => integration } };
  const fixture = { tx, integration, provider: async (...args: unknown[]) => {
    requests.push(args[3] as typeof requests[number]);
    return [1, 3].map(id => ({ id, name: `Serviço ${id}`, price: "10.00", delivery_time: 3, company: { name: "Transportadora sintética" } }));
  } };
  const loaded = { exports: {} as { quoteCart: (cep: string, items: CheckoutRequest["items"]) => Promise<ShippingSelection[]>; validateOrderShipping: (transaction: unknown, input: CheckoutRequest) => Promise<unknown> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), process: { env: { ...process.env, AUTH_SECRET: key } }, Buffer, Date, fixture, console });
  const items = [{ productId: baseProduct.id, quantity: 1, expectedUnitPriceCents: 1000 }];
  const options = await loaded.exports.quoteCart("01001000", items);
  assert.deepEqual(Array.from(options, option => option.serviceId), [1]);
  assert.equal(requests[0].services, "1,2");
  assert.equal(requests[0].volumes[0].weight, 0.35, "uses measured packaged grams, converted to kilograms");
  const input = checkoutRequestSchema.parse({ customer: { name: "Cliente sintético", phone: "44999990000" }, fulfillmentMethod: "DELIVERY", paymentMethod: "PIX", privacyConsent: true, address: { postalCode: "01001000", street: "Rua teste", number: "1", neighborhood: "Teste", city: "São Paulo", state: "SP" }, items, shippingToken: options[0].token });
  await loaded.exports.validateOrderShipping(tx, input);
  const incompatible = signShippingQuote({ provider: "melhor-envio", serviceId: 3, carrier: "Outra transportadora", service: "Teste", priceCents: 1000, deliveryDays: 4, postalCode: "01001000", fingerprint: shippingFingerprint(items, products), revision: 7, expiresAt: Date.now() + 900000 }, key);
  await assert.rejects(loaded.exports.validateOrderShipping(tx, { ...input, shippingToken: incompatible }), /não aceita/);
  integration.settings.serviceIds = [3];
  await assert.rejects(loaded.exports.quoteCart("01001000", items), /transporte autorizado/);
  assert.equal(requests.length, 1, "does not ask an incompatible carrier for a quote");
  integration.settings.serviceIds = [1, 2, 3];
  products = [{ ...baseProduct, category: "Perfumaria" }];
  assert.deepEqual(Array.from(await loaded.exports.quoteCart("01001000", items), option => option.serviceId), [1, 3]);
  await loaded.exports.validateOrderShipping(tx, { ...input, shippingToken: signShippingQuote({ provider: "melhor-envio", serviceId: 3, carrier: "Outra transportadora", service: "Teste", priceCents: 1000, deliveryDays: 4, postalCode: "01001000", fingerprint: shippingFingerprint(items, products), revision: 7, expiresAt: Date.now() + 900000 }, key) });
  products = [{ ...baseProduct, shippingProfile: { ...profile, enabled: false } }];
  await assert.rejects(loaded.exports.quoteCart("01001000", items), /não foi liberado/);
  products = [{ ...baseProduct, requiresPrescription: true }];
  await assert.rejects(loaded.exports.quoteCart("01001000", items), /atendimento/);
  assert.equal(requests.length, 2, "drafts and prescription items never reach the provider");
});
