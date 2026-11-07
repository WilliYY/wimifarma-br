import assert from "node:assert/strict";
import test from "node:test";
import { productCardAlternateImage } from "./card-alternate-image";

test("prévia usa a primeira foto pública distinta da capa, preservando a ordem", () => {
  assert.equal(productCardAlternateImage({ imageUrl: "/cover.webp", imageUrls: [" /cover.webp ", "/brand/medicamento-sem-foto.webp", "/back.webp", "/third.webp"] }), "/back.webp");
  assert.equal(productCardAlternateImage({ imageUrl: " /cover.webp ", imageUrls: ["/cover.webp", "/back.webp"] }), "/back.webp");
});

test("prévia não revela galeria privada, receita ou ilustração", () => {
  const privatePhoto = "/api/admin/fornecedores/imagens/private.webp";
  for (const product of [
    { imageUrl: "/cover.webp", imageUrls: [privatePhoto] },
    { imageUrl: "/cover.webp", imageUrls: ["/back.webp"], requiresPrescription: true },
    { imageUrl: "/brand/medicamento-sem-foto.webp", imageUrls: ["/back.webp"] },
    { imageUrl: privatePhoto, imageUrls: ["/back.webp"] },
    { imageUrl: null, imageUrls: ["/back.webp"] },
    { imageUrl: "/cover.webp", imageUrls: ["/cover.webp"] },
  ]) assert.equal(productCardAlternateImage(product), undefined);
});
