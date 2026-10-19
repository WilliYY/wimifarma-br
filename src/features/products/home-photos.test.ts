import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { validatedHomePhotos } from "./home-photos";

test("home valida arquivo real e rejeita foto ausente, inválida, privada, remota ou ilustrativa", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "home-photos-"));
  try {
    await mkdir(path.join(directory, "uploads/products"), { recursive: true });
    await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).webp().toFile(path.join(directory, "uploads/products/real.webp"));
    await writeFile(path.join(directory, "uploads/products/invalid.webp"), "not an image");
    const complete = await sharp({ create: { width: 200, height: 200, channels: 3, background: "white" } }).png().toBuffer();
    const truncated = complete.subarray(0, Math.floor(complete.length / 2));
    assert.equal((await sharp(truncated).metadata()).width, 200);
    await writeFile(path.join(directory, "uploads/products/truncated.png"), truncated);
    const urls = ["/uploads/products/real.webp", "/uploads/products/missing.webp", "/uploads/products/invalid.webp", "/api/admin/fornecedores/imagens/private.webp", "/brand/medicamento-sem-foto.webp", "https://example.org/remote.webp", "/uploads/products/../private.webp", null];
    assert.deepEqual([...await validatedHomePhotos([...urls, "/uploads/products/truncated.png"], directory)], ["/uploads/products/real.webp"]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
