import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.AUDIT_BASE_URL || "https://wimifarma.com.br";
const outputDir = process.env.AUDIT_OUTPUT_DIR;
if (!outputDir) throw new Error("AUDIT_OUTPUT_DIR is required for non-destructive visual evidence");
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/api/**", (route) => {
  const request = route.request();
  const quoteOnly = request.method() === "POST" && new URL(request.url()).pathname === "/api/fretes/cotacao";
  return ["POST", "PATCH", "PUT", "DELETE"].includes(request.method()) && !quoteOnly ? route.abort() : route.continue();
});

try {
  await page.goto(base, { waitUntil: "networkidle", timeout: 90_000 });
  const card = page.locator("#best-offers-carousel article").filter({ hasText: "Losartana Potássica 50 Mg C/30 Comprimidos Revestidos Teuto" });
  await expect(card).toHaveCount(1);
  await expect(card.getByRole("button", { name: "Adicionar", exact: true })).toBeEnabled();
  await card.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(card.locator("output")).toHaveText("1");
  const href = await card.getByRole("link").first().getAttribute("href");
  await page.goto(new URL(href, base).href, { waitUntil: "networkidle" });
  await expect(page.getByText(/Apresente a receita à farmácia/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar agora", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Comprar agora", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole("heading", { name: "Pagamento", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Pix", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Cartão", exact: true })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  assert.ok((await page.locator("body").innerText()).includes("Losartana"));
  const quoteResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/fretes/cotacao" && response.request().method() === "POST");
  await page.getByLabel("CEP", { exact: true }).fill("87501070");
  const quote = await quoteResponse;
  assert.equal(quote.status(), 200);
  const { data: options } = await quote.json();
  assert.ok(options.length > 0);
  assert.ok(options.every((option) => /^(PAC|SEDEX)$/.test(option.service)));
  assert.deepEqual(options.map((option) => option.priceCents), options.map((option) => option.priceCents).sort((a, b) => a - b));
  await expect(page.getByRole("radio", { name: /PAC/ })).toHaveCount(1);
  await expect(page.getByRole("radio", { name: /SEDEX/ })).toHaveCount(1);
  await page.getByRole("radio", { name: new RegExp(options[0].service) }).check();
  const total = ((598 + options[0].priceCents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  await expect(page.locator('section[aria-label="Resumo da compra"]').getByText(new RegExp(total.replace('.', '\\.')))).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Checkout overflow at ${width}px`);
    await page.screenshot({ path: `${outputDir}/prescription-checkout-${width}.png`, fullPage: true });
  }
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Pagamento", exact: true })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: "PASS", product: "Losartana Teuto 50 mg/30", checks: "public add/buy, ordinary prescription notice, checkout, Pix/card options, no recipe upload, automatic CEP quote sorted by price, reload persistence", options: options.map(({ carrier, service, priceCents, deliveryDays }) => ({ carrier, service, priceCents, deliveryDays })), widths: [320, 390, 768, 1440], writes: "only freight quotation allowed; orders, payments and communications blocked", pageErrors: 0 }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", error: error.message, url: page.url(), writes: "only freight quotation allowed; orders, payments and communications blocked" }));
  process.exitCode = 1;
} finally { await browser.close(); }
