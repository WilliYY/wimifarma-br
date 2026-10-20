import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { importedProductStatus, validatePhotoPublication } from "./photo-publication-policy";

const draft = { id: "product", inventorySource: "DISTRIBUTOR", status: "DRAFT", requiresPrescription: false,
  isPopularPharmacy: false, catalogClassification: null, imageUrl: null, imageAssetId: null };
const photo = { imageUrl: "/uploads/products/photo.webp", imageAssetId: "asset" };
const tx = (reviewed = false) => ({ productImage: { findFirst: async () => ({ id: "asset" }) },
  auditLog: { findFirst: async () => reviewed ? { id: "audit" } : null } }) as unknown as Prisma.TransactionClient;

test("new distributor non-Rx imports wait for photos even without classification", () => {
  assert.equal(importedProductStatus({ requiresPrescription: false }), "DRAFT");
  assert.equal(importedProductStatus({ requiresPrescription: true }), "ACTIVE");
});

test("activation requires a public library cover and explicit ADMIN review", async () => {
  await assert.rejects(validatePhotoPublication(tx(), draft, { ...draft, status: "ACTIVE" }), /foto pública/);
  await assert.rejects(validatePhotoPublication(tx(), draft, { ...draft, ...photo, status: "ACTIVE" }), /ADMIN/);
  await validatePhotoPublication(tx(), draft, { ...draft, ...photo, status: "ACTIVE" }, true);
  await validatePhotoPublication(tx(true), { ...draft, ...photo }, { ...draft, ...photo, status: "ACTIVE" });
  await assert.rejects(validatePhotoPublication(tx(true), draft, { ...draft, ...photo, imageUrl: "/api/private-supplier-images/photo.webp", status: "ACTIVE" }, true), /foto pública/);
});

test("existing active rows keep price edits but cannot lose their photo", async () => {
  const active = { ...draft, status: "ACTIVE" };
  await validatePhotoPublication(tx(), active, active);
  await assert.rejects(validatePhotoPublication(tx(), active, { ...active, catalogClassification: { kind: "HYGIENE" } }), /foto pública/);
  await assert.rejects(validatePhotoPublication(tx(), { ...active, ...photo }, active), /foto pública/);
  await validatePhotoPublication(tx(), { ...active, ...photo }, draft);
});

test("physical stock and Rx publication retain their separate policies", async () => {
  await validatePhotoPublication(tx(), null, { ...draft, inventorySource: "PHARMACY", status: "ACTIVE" });
  await validatePhotoPublication(tx(), null, { ...draft, requiresPrescription: true, status: "ACTIVE" });
});

test("identity changes invalidate photo approval and gallery changes require ADMIN", async () => {
  const current = { ...draft, ...photo, name: "Produto A 50 ml", brand: "Marca", ean: "7896181915638", status: "ACTIVE", imageUrls: [] };
  await assert.rejects(validatePhotoPublication(tx(), current, { ...current, name: "Produto B 30 ml" }), /ADMIN/);
  await assert.rejects(validatePhotoPublication(tx(true), current, { ...current, imageUrls: ["/uploads/products/other.webp"] }), /ADMIN/);
});

test("incidental PRODUCT_UPDATED asset metadata is not a photo review", async () => {
  let query: unknown;
  const client = tx();
  client.auditLog.findFirst = (async (args: unknown) => { query = args; return null; }) as typeof client.auditLog.findFirst;
  await assert.rejects(validatePhotoPublication(client, { ...draft, ...photo }, { ...draft, ...photo, status: "ACTIVE" }), /ADMIN/);
  assert.match(JSON.stringify(query), /photoReview/);
});

test("new physical hygiene and perfumery require photos while legacy stock and price edits remain allowed", async () => {
  for (const kind of ["HYGIENE", "PERFUMERY"]) {
    const physical = { ...draft, inventorySource: "PHARMACY", status: "ACTIVE",
      catalogClassification: { kind, medicineClass: "UNCLASSIFIED", ethical: false, otc: false } };
    await assert.rejects(validatePhotoPublication(tx(), null, physical), /foto pública/);
    await validatePhotoPublication(tx(), physical, physical);
    await validatePhotoPublication(tx(), null, { ...physical, ...photo }, true);
    await validatePhotoPublication(tx(), null, { ...physical, requiresPrescription: true });
    await validatePhotoPublication(tx(), null, { ...physical, isPopularPharmacy: true });
  }
  await validatePhotoPublication(tx(), null, { ...draft, inventorySource: "PHARMACY", status: "ACTIVE",
    catalogClassification: { kind: "MEDICINE", medicineClass: "OTHER", ethical: false, otc: true } });
});
