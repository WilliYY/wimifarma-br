import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { inProcessClient, installCatalogFixture } from "./fixtures/catalog-in-process";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439"); assert.equal(url.pathname, "/cashback_test");
  const base = "http://127.0.0.1:3010";
  const pool = new Pool({ connectionString: url.toString() });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const browser = await chromium.launch();
  const prefix = `catalog-qa-${Date.now()}`;
  const password = randomBytes(24).toString("hex");
  let userId: string | undefined;
  const files = new Set<string>();
  const checks: string[] = [];
  await mkdir("artifacts/catalog-audit", { recursive: true });
  try {
    const user = await db.user.create({ data: { name: "Operador sintetico", email: `${prefix}@example.test`, passwordHash: await hash(password, 10), role: "ADMIN" } });
    userId = user.id;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const isolated = process.argv.includes("--in-process");
    const api = isolated ? inProcessClient() : context.request;
    if (isolated) await installCatalogFixture(context, api as ReturnType<typeof inProcessClient>);
    const csrf = await (await api.get(`${base}/api/auth/csrf`)).json();
    await api.post(`${base}/api/auth/callback/credentials`, { form: { csrfToken: csrf.csrfToken, email: user.email, password }, headers: { "X-Auth-Return-Redirect": "1" } });
    assert.equal((await (await api.get(`${base}/api/auth/session`)).json()).user?.role, "ADMIN");
    const anonymous = await browser.newContext();
    const anonymousApi = isolated ? inProcessClient() : anonymous.request;
    assert.equal((await anonymousApi.post(`${base}/api/admin/uploads/produtos`)).status(), 401);
    assert.equal((await anonymousApi.post(`${base}/api/produtos/sugestoes`, { data: { name: "Teste" } })).status(), 401);
    checks.push("Upload and AI require an authorized session");
    const page = await context.newPage();
    const errors: string[] = []; page.on("pageerror", error => { errors.push(error.message); console.error("Browser:", error.message); });
    let aiRequests = 0;
    await page.route("**/api/produtos/sugestoes", async route => {
      aiRequests++;
      const input = route.request().postDataJSON();
      await new Promise(resolve => setTimeout(resolve, input.name.includes("Antigo") ? 2000 : 100));
      await route.fulfill({ json: { data: { name: input.name, brand: "Marca sintetica", ean: null, category: input.name.includes("Antigo") ? "INCORRETO" : "Higiene", activeIngredients: [], searchTerms: ["higiene", "produto teste"], description: `Descricao factual do ${input.name}, em apresentacao sintetica para testar exclusivamente o cadastro e a exibicao da loja.`, confidence: "high", identityMatch: "exact", evidenceSourceIndexes: [0], warnings: [], sources: [{ title: "Fonte sintetica de QA", url: "https://example.test/produto" }] } } });
    });
    await page.goto(`${base}/admin/catalogos`, { waitUntil: "domcontentloaded" });
    if (!isolated) {
      const navigation = await page.locator("aside nav a").evaluateAll(elements => elements.map(element => element.getAttribute("href")));
      assert.deepEqual(navigation.slice(0, 6), ["/admin/usuarios", "/admin/catalogos", "/admin/ofertas", "/admin/pedidos", "/admin/cupons", "/admin/cashback"]);
    }
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Cadastrar produto" });
    await expect(dialog.locator('select[name="status"]')).toHaveValue("ACTIVE");
    await dialog.getByLabel("Nome do produto", { exact: true }).fill(`${prefix} Antigo`);
    await dialog.getByLabel("Preco normal", { exact: true }).click();
    await expect.poll(() => aiRequests).toBe(1);
    await dialog.getByLabel("Preenchimento automatico com IA", { exact: true }).uncheck();
    await page.waitForTimeout(2100);
    await expect(dialog.getByLabel("Categoria", { exact: true })).toHaveValue("");
    await dialog.getByLabel("Preenchimento automatico com IA", { exact: true }).check();
    await dialog.getByLabel("Nome do produto", { exact: true }).fill(`${prefix} Antigo segundo`);
    await dialog.getByLabel("Preco normal", { exact: true }).click();
    await expect.poll(() => aiRequests).toBe(2);
    await dialog.getByLabel("Nome do produto", { exact: true }).fill(`${prefix} Atual`);
    await dialog.getByLabel("Preco normal", { exact: true }).fill("20");
    await expect(dialog.getByLabel("Categoria", { exact: true })).toHaveValue("Higiene");
    await page.waitForTimeout(2100);
    await expect(dialog.getByLabel("Categoria", { exact: true })).toHaveValue("Higiene");
    await expect(dialog.getByLabel("Marca", { exact: true })).toHaveValue("Marca sintetica");
    const requestCount = aiRequests;
    await dialog.getByLabel("Nome do produto", { exact: true }).focus();
    await dialog.getByLabel("Preco normal", { exact: true }).focus();
    await page.waitForTimeout(1100); assert.equal(aiRequests, requestCount);
    await dialog.getByLabel("Descricao", { exact: true }).fill("Descricao manual do operador preservada durante as pesquisas posteriores de dados para o catalogo.");
    await dialog.getByRole("button", { name: "Pesquisar agora" }).click();
    await expect(dialog.getByRole("button", { name: "Pesquisar agora" })).toBeEnabled();
    await expect(dialog.getByLabel("Descricao", { exact: true })).toHaveValue(/Descricao manual/);
    checks.push("Automatic fill, request deduplication, stale response rejection and preservation of manual fields");
    await dialog.getByLabel("Estoque", { exact: true }).fill("7");
    const image = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: "#da1235" } }).png().toBuffer();
    const photo = { name: `${prefix}.png`, mimeType: "image/png", buffer: image };
    for (const button of ["Nova foto", "Escolher arquivo"]) {
      const chosen = page.waitForEvent("filechooser");
      await dialog.getByRole("button", { name: button, exact: button === "Nova foto" }).click();
      await (await chosen).setFiles(photo);
      await expect(dialog.getByAltText("Previa da imagem do produto")).toBeVisible();
      if (button === "Nova foto") await dialog.getByRole("button", { name: "Retirar foto do produto" }).click();
    }
    const cancelledPicker = page.waitForEvent("filechooser");
    await dialog.getByRole("button", { name: "Nova foto", exact: true }).click();
    await (await cancelledPicker).setFiles([]);
    await expect(dialog.getByAltText("Previa da imagem do produto")).toBeVisible();
    await dialog.getByRole("button", { name: "Ajustar foto" }).click();
    const editor = page.getByRole("dialog", { name: "Ajustar foto do produto" });
    await editor.getByRole("button", { name: "Girar para a direita" }).click();
    await editor.getByRole("button", { name: "Aplicar ajuste" }).click();
    await expect(editor).toBeHidden();
    const upload = page.waitForResponse(response => response.url().endsWith("/api/admin/uploads/produtos") && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "Otimizar foto" }).click();
    const uploaded = await upload; assert.equal(uploaded.status(), 201, await uploaded.text());
    const asset = (await uploaded.json()).data; files.add(path.basename(asset.url));
    assert.ok(asset.width <= 1600 && asset.sizeBytes <= 350_000);
    const photoResponse = await anonymousApi.get(`${base}${asset.url}`);
    assert.equal(photoResponse.status(), 200); assert.equal(photoResponse.headers()["content-type"], "image/webp");
    assert.match(photoResponse.headers()["cache-control"], /immutable/);
    assert.equal((await sharp(await photoResponse.body()).metadata()).format, "webp");
    checks.push("Both photo buttons open the picker; same file can be reselected; crop works; optimized upload is returned by the built image route");
    await dialog.getByLabel("Destacar em Melhores ofertas", { exact: true }).check();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${width}`);
      const overflow = await dialog.evaluate(element => {
        const right = element.getBoundingClientRect().right;
        return [...element.querySelectorAll("*")].filter(child => child.getBoundingClientRect().right > right + 1).slice(0, 8).map(child => ({ tag: child.tagName, class: child.className, width: child.getBoundingClientRect().width }));
      });
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `dialog overflow ${width}: ${JSON.stringify(overflow)}`);
      await page.screenshot({ path: `artifacts/catalog-audit/form-${width}.png` });
    }
    await dialog.getByRole("button", { name: "Cadastrar produto", exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 15000 });
    let product = await db.product.findFirstOrThrow({ where: { name: `${prefix} Atual` } });
    assert.equal(product.status, "ACTIVE"); assert.equal(product.featuredPosition, 1); assert.equal(product.imageAssetId, asset.id);
    assert.equal(await db.productImage.count({ where: { createdById: user.id } }), 1, "save must reuse already-uploaded image");
    const card = page.getByRole("button", { name: `Editar ${prefix} Atual`, exact: true });
    await card.click();
    const edit = page.getByRole("dialog", { name: "Editar produto" });
    await edit.getByRole("button", { name: "Retirar foto do produto" }).click();
    await page.waitForTimeout(500);
    await expect(edit.getByRole("button", { name: "Retirar foto do produto" })).toHaveCount(0);
    await edit.getByRole("button", { name: "Salvar alteracoes" }).click();
    await expect(edit).toBeHidden();
    product = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(product.imageAssetId, null); assert.equal(product.imageUrl, null); assert.equal(product.featuredPosition, null);
    assert.ok(await db.productImage.findUnique({ where: { id: asset.id } }));
    await card.click();
    await edit.getByRole("button", { name: "Biblioteca", exact: true }).click();
    await edit.getByRole("button", { name: new RegExp(prefix + ".*ajustada") }).first().click();
    await edit.getByLabel("Destacar em Melhores ofertas", { exact: true }).check();
    await edit.getByRole("button", { name: "Salvar alteracoes" }).click();
    await expect(edit).toBeHidden();
    product = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(product.imageAssetId, asset.id);
    assert.equal((await api.delete(`${base}/api/admin/imagens-produtos/${asset.id}`)).status(), 409);
    checks.push("Create published and featured atomically; detach and reattach photos; library asset kept and deletion in use rejected");
    const basePayload = { name: `${prefix} API`, price: 20, status: "ACTIVE", stock: 1, imageAssetId: asset.id, featured: true };
    for (let index = 0; index < 9; index++) await db.product.create({ data: { name: `${prefix} slot ${index}`, slug: `${prefix}-slot-${index}`, price: 20, status: "ACTIVE", imageAssetId: asset.id, imageUrl: asset.url, featuredPosition: index + 2 } });
    const before = await db.product.count();
    const full = await api.post(`${base}/api/produtos`, { data: basePayload });
    assert.equal(full.status(), 409, await full.text()); assert.equal(await db.product.count(), before);
    const stale = await api.patch(`${base}/api/produtos/${product.id}`, { data: { ...basePayload, expectedUpdatedAt: "2020-01-01T00:00:00.000Z", name: "Stale" } });
    assert.equal(stale.status(), 409);
    await db.product.deleteMany({ where: { slug: `${prefix}-slot-8` } });
    const race = await Promise.all([0, 1].map(index => api.post(`${base}/api/produtos`, { data: { ...basePayload, name: `${prefix} concurrent ${index}` } })));
    assert.deepEqual(race.map(r => r.status()).sort(), [201, 409]);
    checks.push("Full showcase and concurrent creation cannot produce partial products or duplicate positions; stale edits rejected");
    if (!isolated) {
    await page.goto(`${base}/produto/${product.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(product.name);
    const data = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent() ?? "{}");
    assert.equal(data["@type"], "Product");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/produto/${product.slug}$`));
    checks.push("Product detail, canonical and JSON-LD remain valid");
    }
    assert.deepEqual(errors, []);
    checks.push("No browser JavaScript errors");
    console.log(JSON.stringify({ ok: true, mode: isolated ? "browser fixture + built API handlers, no HTTP server" : "full HTTP server", checks }, null, 2));
  } catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: "artifacts/catalog-audit/failure.png" }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
    const assets = userId ? await db.productImage.findMany({ where: { createdById: userId } }) : [];
    assets.forEach(asset => files.add(path.basename(asset.url)));
    await db.product.deleteMany({ where: { name: { startsWith: prefix } } });
    if (userId) {
      await db.productImage.deleteMany({ where: { createdById: userId } });
      await db.auditLog.deleteMany({ where: { userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
    await db.loginAttempt.deleteMany({ where: { email: `${prefix}@example.test` } });
    for (const file of files) {
      assert.match(file, /^product-[a-f0-9-]+\.webp$/);
      await rm(path.join(process.cwd(), "public", "uploads", "products", file), { force: true });
    }
    await db.$disconnect(); await pool.end();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1; });
