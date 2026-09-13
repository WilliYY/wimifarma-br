import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.AUDIT_BASE_URL || "https://wimifarma.com.br";
const outputDir = process.env.AUDIT_OUTPUT_DIR || "artifacts/shopping-live";
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/api/**", (route) => ["POST", "PATCH", "PUT", "DELETE"].includes(route.request().method()) ? route.abort() : route.continue());

try {
  await page.goto(base, { waitUntil: "networkidle", timeout: 90_000 });
  const candidate = page.locator("#best-offers-carousel article").filter({ has: page.getByRole("button", { name: "Adicionar", exact: true }) }).first();
  const card = page.getByRole("group", { name: await candidate.getAttribute("aria-label"), exact: true });
  await card.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(card.locator("output")).toHaveText("1");
  const productLink = card.getByRole("link").first();
  const productHref = await productLink.getAttribute("href");
  assert.ok(await card.locator("img").evaluate((node) => node.complete && node.naturalWidth > 0));
  await page.getByRole("button", { name: /^Abrir cesta/ }).click();
  const drawer = page.getByRole("dialog", { name: "Minha cesta" });
  await expect(drawer).toBeVisible();
  assert.equal(new URL(page.url()).pathname, "/");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 740 : 1000 });
    await expect(drawer.getByRole("link", { name: "Finalizar pedido" })).toBeInViewport();
    assert.ok(await drawer.evaluate((node) => node.scrollWidth <= node.clientWidth + 1));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outputDir}/drawer-${width}.png` });
  }
  await drawer.getByRole("button", { name: "Continuar comprando", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await productLink.click();
  await expect(page).toHaveURL(new URL(productHref, base).href);
  await page.goto(base, { waitUntil: "networkidle" });
  const existing = page.locator("#best-offers-carousel article").filter({ has: page.locator("output") }).first();
  await existing.getByRole("button", { name: "Comprar", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout#identificacao$/);
  await page.getByLabel("Nome completo").fill("Cliente QA local");
  await page.getByLabel("WhatsApp / telefone").fill("44999999999");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("CEP", { exact: true }).fill("87501070");
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Umuarama", { timeout: 15_000 });
  await expect(page.getByLabel("UF", { exact: true })).toHaveValue("PR");
  await expect(page.getByLabel("Endereco", { exact: true })).not.toHaveValue("");
  await expect(page.getByText("Entrega pelo site indisponivel para este CEP")).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.getByRole("heading", { name: "Como deseja receber?" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.body.scrollLeft), 0, "Viewport changes must not shift the page horizontally");
    await page.screenshot({ path: `${outputDir}/address-${width}.png` });
  }
  await page.getByRole("button", { name: "Escolher retirada" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Como prefere pagar?" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Como deseja receber?" })).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("radio", { name: /Retirar na farmacia/ })).toBeChecked();
  const health = await page.request.get(`${base}/api/health`);
  assert.equal(health.status(), 200);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: "PASS", screenshots: 8, widths: [320, 390, 768, 1440], pageErrors: 0, writes: "all API mutations blocked", checks: "drawer, real product images, product navigation, buy checkout, live CEP, coverage, history, draft reload, health" }));
} finally { await browser.close(); }
