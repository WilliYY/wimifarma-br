import assert from "node:assert/strict";
import test from "node:test";
import { productCreateSchema, productUpdateSchema } from "./schema";
import { productGalleryImages } from "./gallery";
import { resolveProductGallery } from "./mutations";
import { withCommerceAvailability } from "@/features/supplier-catalog/commerce";

test("galeria preserva capa, ordem e fotos restantes sem duplicar", () => {
  assert.deepEqual(productGalleryImages("/cover.webp", ["/cover.webp", "/back.webp", "/back.webp"]), ["/cover.webp", "/back.webp"]);
  assert.deepEqual(productGalleryImages(null, ["/back.webp"]), ["/back.webp"]);
});

test("criação e edição limitam entrada da galeria", () => {
  const base = { name: "Produto sintético", price: 10, imageUrls: Array(7).fill("/photo.webp") };
  assert.equal(productCreateSchema.safeParse(base).success, false);
  assert.equal(productUpdateSchema.safeParse({ ...base, expectedUpdatedAt: "2026-10-18T12:00:00.000Z" }).success, false);
});

test("galeria resolve somente imagens públicas existentes e limita seis fotos totais", async () => {
  const transaction = { productImage: { findMany: async () => [{ url: "/back.webp" }] } } as unknown as Parameters<typeof resolveProductGallery>[0];
  assert.deepEqual(await resolveProductGallery(transaction, "/cover.webp", ["/cover.webp", "/back.webp", "/back.webp"]), ["/back.webp"]);
  await assert.rejects(resolveProductGallery(transaction, "/cover.webp", ["/missing.webp"]), /biblioteca/);
  await assert.rejects(resolveProductGallery(transaction, null, ["/api/admin/fornecedores/imagens/private.webp"]), /públicas/);
  await assert.rejects(resolveProductGallery(transaction, "/cover.webp", Array.from({ length: 6 }, (_, index) => `/${index}.webp`)), /seis/);
});

test("DTO de distribuidor Rx remove arrays e metadados de imagens privadas", () => {
  const privateUrl = "/api/admin/fornecedores/imagens/00000000-0000-4000-8000-000000000000.webp";
  const raw = { inventorySource: "DISTRIBUTOR" as const, requiresPrescription: true, stock: 0, price: 10, imageUrl: privateUrl, imageUrls: [privateUrl, "/back.webp", "/back.webp"], imageAsset: { url: privateUrl } };
  const safe = withCommerceAvailability(raw);
  assert.equal(safe.imageUrl, null);
  assert.deepEqual(safe.imageUrls, ["/back.webp"]);
  assert.equal(safe.imageAsset, null);
  assert.doesNotMatch(JSON.stringify(safe), /api\/admin\/fornecedores\/imagens/);
  assert.deepEqual(withCommerceAvailability({ ...raw, inventorySource: "PHARMACY" as const }).imageUrls, ["/back.webp"]);
});
