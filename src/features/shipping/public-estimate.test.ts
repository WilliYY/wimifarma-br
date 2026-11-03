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

  product = { ...base, shippingProfile: { ...profile, approvedServiceIds: [] } };
  const unreviewed = await loaded.exports.estimateProductShipping(input);
  assert.equal(unreviewed.mode, "estimate", "empty draft approvals mean not reviewed, never shipping authorization");
  assert.deepEqual(Array.from(unreviewed.options, option => option.serviceId), [1, 2, 3]);
  assert.equal(unreviewed.options[0].benefit, undefined);
  assert.equal(JSON.stringify(unreviewed).includes("token"), false);
  product = { ...base, shippingProfile: { ...profile, approvedServiceIds: [1] } };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, option => option.serviceId), [1], "nonempty draft approvals still restrict the estimate");
  product = { ...base, shippingProfile: { ...profile, approvedServiceIds: [], cargoKinds: ["aerosol"] } };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, option => option.serviceId), [3], "empty draft approvals never override blocked cargo");
  product = { ...base, catalogClassification: { kind: "MEDICINE" }, shippingProfile: { ...profile, approvedServiceIds: [] } };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, option => option.serviceId), [1, 2], "empty draft approvals preserve medication restrictions");
  for (const patch of [{ stock: 0 }, { stock: 1 }, { deletedAt: new Date() }, { status: "DRAFT" }, { status: "ARCHIVED" }, { inventorySource: "DISTRIBUTOR", stock: 100, supplierOffers: [] }, { shippingProfile: { ...profile, notifyOnlyPendingLogistics: true } }]) {
    product = { ...base, ...patch };
    for (const postalCode of ["01001000", "87525000"]) {
      const before = calls.length;
      await assert.rejects(loaded.exports.estimateProductShipping({ ...input, postalCode }), /indisponível/);
      assert.equal(calls.length, before, "unavailable inventory never reaches the provider, including local CEP");
    }
  }
  product = { ...base };
  const beforeLocal = calls.length;
  const local = await loaded.exports.estimateProductShipping({ ...input, postalCode: "87525000" });
  assert.equal(local.mode, "local");
  assert.equal(local.options.length, 0);
  assert.equal(calls.length, beforeLocal, "local delivery does not contact a carrier");
  const supplierOffer = { id: "synthetic-offer", supplier: "SYNTHETIC", eanNormalized: "01234567890128", unitCostCents: 1000, available: true, stockQuantity: 5, allocationQuantity: 5, reservedQuantity: 0, committedQuantity: 0, observedAt: new Date(Date.now() - 1000), validUntil: new Date(Date.now() + 60000) };
  for (const patch of [{ available: false }, { stockQuantity: 0 }]) {
    product = { ...base, inventorySource: "DISTRIBUTOR", eanNormalized: supplierOffer.eanNormalized, stock: 100, supplierOffers: [{ ...supplierOffer, ...patch }] };
    const before = calls.length;
    await assert.rejects(loaded.exports.estimateProductShipping({ ...input, postalCode: "87525000" }), /indisponível/);
    assert.equal(calls.length, before);
  }
  product = { ...base, inventorySource: "DISTRIBUTOR", eanNormalized: supplierOffer.eanNormalized, stock: 0, supplierOffers: [supplierOffer] };
  assert.equal((await loaded.exports.estimateProductShipping({ ...input, postalCode: "87525000" })).mode, "local", "supplier effective availability takes precedence over physical stock");
  product = { ...base, shippingProfile: { ...profile, enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1] } };
  const ready = await loaded.exports.estimateProductShipping(input);
  assert.equal(ready.mode, "available");
  assert.equal(ready.options[0].benefit?.customerPriceCents, 1250);
  product = { ...base, shippingProfile: { ...profile, enabled: false, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [1] } };
  assert.equal((await loaded.exports.estimateProductShipping(input)).mode, "estimate");
  product = { ...base, shippingProfile: { ...profile, enabled: true, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [] } };
  await assert.rejects(loaded.exports.estimateProductShipping(input), /atendimento/);
  product = { ...base, shippingProfile: { ...profile, enabled: false, transportReviewed: true, cargoKinds: ["general"], approvedServiceIds: [] } };
  await assert.rejects(loaded.exports.estimateProductShipping(input), /atendimento/, "reviewed empty approvals remain a refusal even when disabled");
  assert.deepEqual(Array.from(ready.options, p => p.serviceId), [1]);
  product = { ...base, shippingProfile: { ...profile, cargoKinds: ["unspecified"] } };
  assert.equal((await loaded.exports.estimateProductShipping(input)).mode, "estimate");
  product = { ...base, shippingProfile: { ...profile, cargoKinds: ["aerosol"] } };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, p => p.serviceId), [3]);
  product = { ...base, name: "Aerossol sintético" };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, p => p.serviceId), [3], "negative name inference is preserved");
  product = { ...base, name: "Perfume sintético" };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, p => p.serviceId), [3], "perfume name does not bypass carrier prohibitions");
  const absorbentServices = [1, 2, 3, 12, 22, 31, 33];
  integration.settings.serviceIds = absorbentServices;
  for (const name of ["Absorvente Always Diários Com Perfume 40 unidades", "Absorvente Always Sem Perfume 80 unidades", "Absorvente Carefree Proteção Com Perfume 15Un", "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 15 unidades", "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 40 unidades", "Absorvente Intimus Cuidado Diário Ph Balanceado Sem Perfume 80 unidades"]) {
    for (const reviewed of [false, true]) {
      product = { ...base, name, catalogClassification: { kind: "HYGIENE" }, shippingProfile: { ...profile, enabled: reviewed, transportReviewed: reviewed, cargoKinds: ["general"], approvedServiceIds: reviewed ? absorbentServices : [] } };
      const snapshot = structuredClone(product);
      const result = await loaded.exports.estimateProductShipping(input);
      assert.deepEqual(Array.from(result.options, option => option.serviceId), absorbentServices, name);
      assert.equal(calls.at(-1)?.services, absorbentServices.join(","), name);
      assert.equal(result.mode, reviewed ? "available" : "estimate", name);
      assert.deepEqual(product, snapshot);
    }
  }
  for (const name of ["Perfume sintético", "Absorvente com perfume", "Absorvente perfume 40 unidades", "Absorvente com perfume spray 40 unidades", "Absorvente com perfume elétrico 40 unidades", "Absorvente com perfume bateria 40 unidades", "Absorvente umedecido com perfume 40 unidades", "Absorvente com perfume 100ml 40 unidades"]) {
    product = { ...base, name, shippingProfile: { ...profile, cargoKinds: ["general"] } };
    assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, option => option.serviceId), [3, 22, 33], name);
  }
  product = { ...base, name: "Absorvente com perfume aerossol 40 unidades", shippingProfile: { ...profile, cargoKinds: ["general"] } };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, option => option.serviceId), [3, 22], "aerosol restrictions remain stricter than perfume restrictions");
  product = { ...base, name: "Absorvente sem perfume 40 unidades", shippingProfile: { ...profile, cargoKinds: ["perfume"] } };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, option => option.serviceId), [3, 22, 33], "explicit perfume cargo is preserved");
  product = { ...base, name: "Absorvente sem perfume 40 unidades", shippingProfile: { ...profile, cargoKinds: ["general"], approvedServiceIds: [3] } };
  assert.deepEqual(Array.from((await loaded.exports.estimateProductShipping(input)).options, option => option.serviceId), [3], "existing service approval is preserved");
  integration.settings.serviceIds = [1, 2, 3];
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
  for (const patch of [{ isPopularPharmacy: true }, { requiresPrescription: true, prescriptionType: "CONTROLLED" }, { requiresPrescription: true, prescriptionType: "UNREVIEWED" }, { requiresPrescription: true, prescriptionType: "ANTIMICROBIAL" }]) {
    product = { ...base, ...patch };
    const before = calls.length;
    await assert.rejects(loaded.exports.estimateProductShipping({ ...input, postalCode: "87525000" }), /atendimento/);
    assert.equal(calls.length, before, "local CEP never bypasses legal restrictions");
  }
  product = { ...base }; failure = true;
  await assert.rejects(loaded.exports.estimateProductShipping(input), /synthetic provider failure/);
  failure = false; integration.settings.enabled = false;
  await assert.rejects(loaded.exports.estimateProductShipping(input), /preparação/);
});
