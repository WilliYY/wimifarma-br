import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { validateShippingProduct } from "./rules";

test("public estimate calculates complete drafts without approving shipment or exposing checkout tokens", async () => {
  const compiled = await build({ entryPoints: ["src/features/shipping/public-estimate.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "estimate-fixture", setup(builder) {
    builder.onResolve({ filter: /lib\/prisma$|^\.\/integration$|^\.\/provider$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("prisma") ? "export const getPrisma=()=>globalThis.fixture.db;" : args.path.endsWith("integration") ? "export const readShippingIntegration=async()=>globalThis.fixture.integration;export const shippingAccessToken=async()=> 'private-provider-token';export const SHIPPING_INTEGRATION_ID='fixture';" : "export const melhorEnvioRequest=async(...args)=>globalThis.fixture.provider(...args);" }));
  } }] });
  const profile = { enabled: false, transportReviewed: false, measurementBasis: "estimated", weightGrams: 350, widthCm: 15, heightCm: 10, lengthCm: 20 };
  const base = { id: "synthetic-product", name: "Produto sintético", slug: "synthetic", category: "Higiene", price: "25.00", promotionalPrice: "20.00", status: "ACTIVE", stock: 10, requiresPrescription: false, prescriptionType: undefined, isPopularPharmacy: false, shippingProfile: profile, updatedAt: new Date(0), inventorySource: "PHARMACY", supplierOffers: [] };
  let product: Record<string, unknown> = { ...base };
  let failure = false;
  const calls: { services: string; products: { id: string; width: number; height: number; length: number; weight: number; insurance_value: number; quantity: number }[] }[] = [];
  const integration = { settings: { enabled: true, environment: "production", originPostalCode: "87525000", postingLocations: [], preparationDays: 2, serviceIds: [1, 2, 3], contactEmail: "qa@example.invalid" }, revision: 1 };
  const fixture = { integration, db: { product: { findUnique: async () => product } }, provider: async (...args: unknown[]) => {
    if (failure) throw new Error("synthetic provider failure");
    const request = args[3] as typeof calls[number]; calls.push(request);
    return request.services.split(",").map(Number).map(id => ({ id, name: `Serviço ${id}`, price: "12.50", delivery_time: 3, company: { name: "Transportadora sintética" }, packages: request.products.map(p => ({ dimensions: { width: p.width, height: p.height * p.quantity, length: p.length }, weight: p.weight * p.quantity, insurance_value: p.insurance_value * p.quantity, products: [{ id: p.id, quantity: p.quantity }] })) }));
  } };
  const loaded = { exports: {} as { estimateProductShipping(input: { productId: string; quantity: number; postalCode: string }): Promise<{ mode: string; options: { priceCents: number; deliveryDays: number; serviceId: number; benefit?: { customerPriceCents: number } }[] }> } };
  vm.runInNewContext(compiled.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), process, Buffer, Date, fixture, console });
  const input = { productId: base.id, quantity: 2, postalCode: "01001000" };
  const estimate = await loaded.exports.estimateProductShipping(input);
  assert.equal(estimate.mode, "estimate");
  assert.equal(estimate.options[0].benefit, undefined, "unreviewed estimates never promise subsidies");
  assert.equal(estimate.options[0].priceCents, 1250);
  assert.equal(estimate.options[0].deliveryDays, 5);
  assert.equal(calls[0].products[0].insurance_value, 20, "uses current promotional price from server");
  assert.equal(calls[0].products[0].quantity, 2);
  for (const secret of ["token", "supplier", "unitCost", "packaging", "shippingProfile"]) assert.equal(JSON.stringify(estimate).includes(secret), false);
  assert.deepEqual(product.shippingProfile, profile);
  assert.throws(() => validateShippingProduct({ ...base, prescriptionType: undefined, status: "ACTIVE" } as Parameters<typeof validateShippingProduct>[0]), /pendentes/, "checkout continues rejecting drafts");

  product = { ...base, shippingProfile: { ...profile, notifyOnlyPendingLogistics: true } };
  assert.equal((await loaded.exports.estimateProductShipping(input)).mode, "estimate");
  product = { ...base, shippingProfile: { ...profile, enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1] } };
  const ready = await loaded.exports.estimateProductShipping(input);
  assert.equal(ready.mode, "available");
  assert.equal(ready.options[0].benefit?.customerPriceCents, 1250);
  product = { ...base, shippingProfile: { ...profile, enabled: false, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1] } };
  assert.equal((await loaded.exports.estimateProductShipping(input)).mode, "estimate");
  product = { ...base, shippingProfile: { ...profile, enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [] } };
  await assert.rejects(loaded.exports.estimateProductShipping(input), /atendimento/);
  assert.deepEqual(Array.from(ready.options, p => p.serviceId), [1]);
  product = { ...base, shippingProfile: { ...profile, cargoKinds: ["unspecified"] } };
  assert.equal((await loaded.exports.estimateProductShipping(input)).mode, "estimate");
  product = { ...base, shippingProfile: { ...profile, cargoKinds: ["aerosol"] } };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, p => p.serviceId), [3]);
  product = { ...base, name: "Aerossol sintético" };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, p => p.serviceId), [3], "negative name inference is preserved");
  product = { ...base, name: "Perfume sintético" };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, p => p.serviceId), [3], "perfume name does not bypass carrier prohibitions");
  product = { ...base, shippingProfile: { ...profile, cargoKinds: ["temperature_sensitive"] } };
  assert.equal((await loaded.exports.estimateProductShipping(input)).mode, "estimate", "unknown conservation does not authorize shipment");
  product = { ...base, catalogClassification: { kind: "MEDICINE" } };
  await loaded.exports.estimateProductShipping(input);
  assert.equal(calls.at(-1)?.services, "1,2");
  for (const patch of [{ shippingProfile: null }, { shippingProfile: { ...profile, weightGrams: null } }, { shippingProfile: { ...profile, widthCm: 0 } }, { shippingProfile: { ...profile, cargoKinds: ["aerosol", "medication"] } }, { isPopularPharmacy: true }, { requiresPrescription: true, prescriptionType: "UNREVIEWED" }, { requiresPrescription: true, prescriptionType: "CONTROLLED" }, { requiresPrescription: true, prescriptionType: "ANTIMICROBIAL" }, { status: "DRAFT" }]) {
    product = { ...base, ...patch }; const before = calls.length;
    await assert.rejects(loaded.exports.estimateProductShipping(input));
    assert.equal(calls.length, before, "invalid data or restricted cargo never reaches provider");
  }
  product = { ...base }; failure = true;
  await assert.rejects(loaded.exports.estimateProductShipping(input), /synthetic provider failure/);
  failure = false; integration.settings.enabled = false;
  await assert.rejects(loaded.exports.estimateProductShipping(input), /preparação/);
});
