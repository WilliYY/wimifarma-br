import assert from "node:assert/strict";
import test, { mock } from "node:test";
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

test("home reutiliza a decodificação e invalida a foto quando o arquivo muda", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "home-photos-cache-"));
  const decode = mock.method(sharp.prototype, "resize");
  const url = "/uploads/products/cached.webp";
  const file = path.join(directory, url.slice(1));
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } }).webp().toFile(file);
    assert.deepEqual([...await validatedHomePhotos([url], directory)], [url]);
    assert.deepEqual([...await validatedHomePhotos([url], directory)], [url]);
    assert.equal(decode.mock.callCount(), 1, "arquivo inalterado não deve ser decodificado novamente");
    await writeFile(file, "invalid replacement");
    assert.deepEqual([...await validatedHomePhotos([url], directory)], []);
    await sharp({ create: { width: 30, height: 30, channels: 3, background: "red" } }).webp().toFile(file);
    assert.deepEqual([...await validatedHomePhotos([url], directory)], [url]);
    assert.equal(decode.mock.callCount(), 2);
    await rm(file);
    assert.deepEqual([...await validatedHomePhotos([url], directory)], []);
  } finally { decode.mock.restore(); await rm(directory, { recursive: true, force: true }); }
});

test("home compartilha a validação simultânea somente para o mesmo arquivo e diretório", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "home-photos-concurrent-"));
  const decode = mock.method(sharp.prototype, "resize");
  const url = "/uploads/products/concurrent.webp";
  try {
    await mkdir(path.join(directory, "uploads/products"), { recursive: true });
    await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } }).webp().toFile(path.join(directory, url.slice(1)));
    const results = await Promise.all([validatedHomePhotos([url], directory), validatedHomePhotos([url], directory)]);
    assert(results.every(result => result.has(url)));
    assert.equal(decode.mock.callCount(), 1);
    assert.deepEqual([...await validatedHomePhotos([url], path.join(directory, "other"))], []);
  } finally { decode.mock.restore(); await rm(directory, { recursive: true, force: true }); }
});

test("home tenta novamente após falha transitória sem exigir alteração do arquivo", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "home-photos-retry-"));
  const url = "/uploads/products/retry.webp";
  const decode = mock.method(sharp.prototype, "resize", () => { throw new Error("temporary decoder failure"); });
  try {
    await mkdir(path.join(directory, "uploads/products"), { recursive: true });
    await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } }).webp().toFile(path.join(directory, url.slice(1)));
    assert.deepEqual([...await validatedHomePhotos([url], directory)], []);
    decode.mock.restore();
    assert.deepEqual([...await validatedHomePhotos([url], directory)], [url]);
  } finally { decode.mock.restore(); await rm(directory, { recursive: true, force: true }); }
});
