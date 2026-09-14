import assert from "node:assert/strict";
import { copyFile, mkdir, rmdir, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3010";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Only local QA fixtures are allowed");
const outputDir = process.env.AUDIT_OUTPUT_DIR || "artifacts/shopping-flow";
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const requests = [];
page.on("pageerror", (error) => errors.push(error.message));
const name = "Produto de teste com nome longo para conferencia do layout";
const cartKey = "wimifarma-cart-v1";
const draftKey = "wimifarma-checkout-draft-v1";
const fixtureDirectory = fileURLToPath(new URL("../src/app/qa-shopping/", import.meta.url));
const fixturePath = fileURLToPath(new URL("../src/app/qa-shopping/page.tsx", import.meta.url));
let fixtureCreated = false;
const fixture = { id: "qa-product", slug: "qa-product", name, imageUrl: "/favicon.svg", category: "Cuidados pessoais", unitPriceCents: 1800, originalPriceCents: 2000, stock: 3, requiresPrescription: false, isPopularPharmacy: false, quantity: 1 };
let submitted;

await page.route("**/api/**", async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  if (request.method() === "POST") {
    if (path === "/api/pedidos") {
      submitted = request.postDataJSON();
      return route.fulfill({ json: { data: { number: "QA-LOCAL-ONLY", totalCents: 1800 } } });
    }
    return route.abort();
  }
  if (!path.startsWith("/api/cep/")) return route.continue();
  const code = path.split("/").at(-1);
  requests.push(code);
  if (code === "99999999") return route.fulfill({ status: 404, json: { error: "CEP nao encontrado. Confira os numeros informados." } });
  if (code === "87525111") return route.fulfill({ status: 503, body: "unavailable" });
  if (code === "87525999") await new Promise((resolve) => setTimeout(resolve, 800));
  const outside = code === "87501070";
  return route.fulfill({ json: { data: { postalCode: code, street: code === "87525000" ? "" : outside ? "Rua de teste externa" : "Rua de teste local", neighborhood: code === "87525000" ? "" : "Centro", city: outside ? "Umuarama" : "Ivate", state: "PR" } } });
});

async function openCheckout() { await page.getByRole("button", { name: "Checkout teste", exact: true }).click(); }
async function next() { await page.getByRole("button", { name: "Continuar", exact: true }).click(); }
async function fillCustomer() { await page.getByLabel("Nome completo").fill("Cliente QA"); await page.getByLabel("WhatsApp / telefone").fill("44999999999"); }
async function cart() { return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "[]"), cartKey); }
async function noOverflow() { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No document horizontal overflow"); }

try {
  await mkdir(fixtureDirectory, { recursive: true });
  await copyFile(new URL("./fixtures/qa-shopping-page.tsx", import.meta.url), fixturePath, constants.COPYFILE_EXCL);
  fixtureCreated = true;
  await expect.poll(async () => {
    try { return (await page.request.get(`${base}/qa-shopping`)).status(); } catch { return 0; }
  }, { timeout: 60_000 }).toBe(200);
  await page.goto(`${base}/qa-shopping`, { waitUntil: "networkidle", timeout: 90_000 });
  const card = page.locator("article").first();
  await card.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(card.locator("output")).toHaveText("1");
  assert.equal(new URL(page.url()).pathname, "/qa-shopping");
  await card.getByRole("button", { name: `Aumentar ${name}`, exact: true }).click();
  await card.getByRole("button", { name: `Aumentar ${name}`, exact: true }).click();
  await expect(card.locator("output")).toHaveText("3");
  await expect(card.getByRole("button", { name: `Aumentar ${name}`, exact: true })).toBeDisabled();
  await page.getByRole("button", { name: /^Abrir cesta/ }).click();
  const drawer = page.getByRole("dialog", { name: "Minha cesta" });
  await expect(drawer).toBeVisible();
  assert.equal(new URL(page.url()).pathname, "/qa-shopping");
  await expect(drawer.locator("output")).toHaveText("3");
  await drawer.getByRole("button", { name: `Diminuir ${name}`, exact: true }).click();
  await expect(drawer.locator("output")).toHaveText("2");
  assert.match(await drawer.locator("footer").innerText(), /36,00/);
  assert.notEqual(await drawer.getAttribute("aria-modal"), "true", "Basket must not make the store modal");
  await card.getByRole("button", { name: `Aumentar ${name}`, exact: true }).click();
  await expect(drawer).toBeVisible();
  await expect(drawer.locator("output")).toHaveText("3");
  await card.getByRole("button", { name: `Diminuir ${name}`, exact: true }).click();
  await expect(drawer.locator("output")).toHaveText("2");
  await expect(card.getByRole("button", { name: `Diminuir ${name}`, exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  assert.equal(await drawer.evaluate((node) => node.contains(document.activeElement)), false, "Keyboard can navigate the store while basket remains open");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Continuar comprando", exact: true }).focus();
  await page.keyboard.press("Tab");
  assert.equal(await drawer.evaluate((node) => node.contains(document.activeElement)), false, "Tab can leave the last basket control");
  await drawer.getByRole("button", { name: "Fechar cesta", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await drawer.evaluate((node) => node.contains(document.activeElement)), false, "Shift+Tab can leave the first basket control");
  const initialScroll = await page.evaluate(() => scrollY);
  await page.mouse.move(50, 350);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initialScroll);
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole("button", { name: /^Abrir cesta/ })).toBeFocused();
  await expect(card.locator("output")).toHaveText("2");
  console.log("PASS non-modal basket, outside clicks, store keyboard navigation/scrolling, quantity sync, stock, subtotal and Escape");

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 740 : 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await noOverflow();
    await page.screenshot({ path: `${outputDir}/cards-${width}.png` });
    await page.getByRole("button", { name: /^Abrir cesta/ }).click();
    await expect(drawer.getByRole("link", { name: "Finalizar pedido" })).toBeInViewport();
    await expect.poll(async () => {
      const box = await drawer.boundingBox();
      return box.x >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= page.viewportSize().height + 1;
    }).toBe(true);
    if (width < 500) {
      assert.ok((await drawer.boundingBox()).y >= 740 * 0.25, "Mobile basket leaves the store accessible above it");
      await page.mouse.move(40, 180);
      await page.mouse.wheel(0, 300);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
      await expect(drawer).toBeVisible();
    }
    await noOverflow();
    assert.equal(await page.evaluate(() => document.body.scrollLeft), 0);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${outputDir}/drawer-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const carousel = page.locator("#best-offers-carousel");
  await carousel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await carousel.evaluate((node) => node.scrollTo({ left: 0, behavior: "instant" }));
  const box = await carousel.boundingBox();
  assert.equal(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest("#best-offers-carousel")), { x: box.x + box.width * 0.75, y: box.y + 80 }), true, "Drag starts on the carousel, not a closing overlay");
  const beforeDrag = await carousel.evaluate((node) => node.scrollLeft);
  await page.mouse.move(box.x + box.width * 0.75, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + 80, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => carousel.evaluate((node) => node.scrollLeft)).toBeGreaterThan(beforeDrag + 50);
  assert.equal(new URL(page.url()).pathname, "/qa-shopping");
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.('a[href="/produto/qa-product"]');
      if (!link) return;
      document.documentElement.dataset.qaClickedProduct = link.getAttribute("href");
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  });
  await card.scrollIntoViewIfNeeded();
  const cardBox = await card.boundingBox();
  await page.mouse.click(cardBox.x + cardBox.width - 10, cardBox.y + 20);
  await expect(page.locator("html")).toHaveAttribute("data-qa-clicked-product", "/produto/qa-product");
  await page.goto(`${base}/qa-shopping`, { waitUntil: "networkidle" });
  await page.route("**/checkout**", (route) => route.abort());
  const buyNavigation = page.waitForRequest((request) => new URL(request.url()).pathname === "/checkout");
  await page.locator("article").first().getByRole("button", { name: "Comprar", exact: true }).click();
  await buyNavigation;
  await page.waitForTimeout(700);
  await page.goto(`${base}/qa-shopping`, { waitUntil: "networkidle" });
  assert.equal((await cart())[0].quantity, 2, "Buy preserves existing quantity");
  console.log("PASS responsive cards/drawer, carousel dragging, whole-card navigation and buy checkout request preserving quantity");

  await page.getByRole("button", { name: /^Abrir cesta/ }).click();
  await drawer.getByRole("button", { name: "Limpar cesta", exact: true }).click();
  await drawer.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(drawer.locator("output")).toHaveText("2");
  await drawer.getByRole("button", { name: "Limpar cesta", exact: true }).click();
  await drawer.getByRole("button", { name: "Sim, limpar", exact: true }).click();
  await expect(drawer.getByRole("heading", { name: "Sua cesta esta vazia" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("article").first().getByRole("button", { name: "Adicionar", exact: true }).click();
  await openCheckout();
  await fillCustomer();
  await next();
  await expect(page).toHaveURL(/#entrega$/);
  await page.getByLabel("CEP", { exact: true }).fill("87501070");
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Umuarama");
  await expect(page.getByLabel("UF", { exact: true })).toHaveValue("PR");
  await expect(page.getByLabel("Endereco", { exact: true })).toHaveValue("Rua de teste externa");
  await page.getByLabel("Numero", { exact: true }).fill("123");
  await page.getByLabel("Complemento (opcional)").fill("Casa QA");
  await next();
  await expect(page).toHaveURL(/#entrega$/);
  await expect(page.getByRole("alert").filter({ hasText: "Ainda nao entregamos" })).toBeVisible();
  await page.getByLabel("CEP", { exact: true }).fill("87525000");
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Ivate");
  await expect(page.getByLabel("Endereco", { exact: true })).toHaveValue("");
  await page.getByLabel("Endereco", { exact: true }).fill("Rua preenchida pelo cliente");
  await page.getByLabel("Bairro", { exact: true }).fill("Centro");
  await expect(page.getByLabel("Numero", { exact: true })).toHaveValue("123");
  await next();
  await expect(page).toHaveURL(/#pagamento$/);
  await page.getByText("Cartao", { exact: true }).click();
  await page.goBack();
  await expect(page.getByLabel("Endereco", { exact: true })).toHaveValue("Rua preenchida pelo cliente");
  await page.goForward();
  await expect(page.getByRole("radio", { name: /Cartao/ })).toBeChecked();
  await page.getByRole("link", { name: "Voltar", exact: true }).click();
  await expect(page).toHaveURL(/#entrega$/);
  await page.reload({ waitUntil: "networkidle" });
  await openCheckout();
  await expect(page).toHaveURL(/#entrega$/);
  await expect(page.getByLabel("Numero", { exact: true })).toHaveValue("123");
  await expect(page.getByLabel("Complemento (opcional)")).toHaveValue("Casa QA");
  console.log("PASS CEP lookup, generic CEP, coverage, browser Back/Forward, step Back and draft reload");

  await page.getByLabel("CEP", { exact: true }).fill("87525111");
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  await page.getByLabel("CEP", { exact: true }).fill("87525999");
  await page.waitForRequest("**/api/cep/87525999");
  await page.getByLabel("CEP", { exact: true }).fill("87501070");
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Umuarama");
  await page.waitForTimeout(900);
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Umuarama");
  await page.getByRole("button", { name: "Escolher retirada" }).click();
  await next();
  await expect(page.getByText(/na retirada, na maquininha/)).toBeVisible();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await noOverflow(); await page.waitForTimeout(300); assert.equal(await page.evaluate(() => document.body.scrollLeft), 0); await page.screenshot({ path: `${outputDir}/payment-${width}.png` }); }
  await next();
  await page.getByRole("checkbox").check();
  await page.reload({ waitUntil: "networkidle" });
  await openCheckout();
  await expect(page).toHaveURL(/#revisao$/);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
  await expect(page.getByText("QA-LOCAL-ONLY")).toBeVisible();
  assert.equal(submitted.fulfillmentMethod, "PICKUP");
  assert.equal(submitted.address, undefined);
  assert.equal(submitted.paymentMethod, "CARD_ON_DELIVERY");
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), draftKey), null);
  assert.deepEqual(await cart(), []);
  console.log("PASS unavailable/stale CEP, pickup payment copy, consent reset, mocked submission and draft clearing");

  await page.goto(`${base}/qa-shopping`, { waitUntil: "networkidle" });
  await page.evaluate(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(Array.from({ length: 14 }, (_, index) => ({ ...fixture, id: `many-${index}` })))), { key: cartKey, fixture });
  await page.reload({ waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 740 });
  await page.getByRole("button", { name: /^Abrir cesta/ }).click();
  await expect(drawer.getByRole("link", { name: "Finalizar pedido" })).toBeInViewport();
  const scroll = drawer.locator(".overflow-y-auto");
  await scroll.hover();
  await page.mouse.wheel(0, 800);
  await expect.poll(() => scroll.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
  await page.screenshot({ path: `${outputDir}/drawer-many-mobile.png` });
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.body.style.overflow), "", "Closing restores page scrolling");
  console.log("PASS long basket scrolling and fixed footer on mobile");
  const isolated = await browser.newContext({ viewport: { width: 390, height: 740 } });
  await isolated.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.removeItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
  });
  const privatePage = await isolated.newPage();
  privatePage.on("pageerror", (error) => errors.push(error.message));
  await privatePage.goto(`${base}/qa-shopping`, { waitUntil: "networkidle" });
  await privatePage.locator("article").first().getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(privatePage.locator("article").first().locator("output")).toHaveText("1");
  await privatePage.getByRole("button", { name: "Checkout teste", exact: true }).click();
  await privatePage.getByLabel("Nome completo").fill("Cliente sem storage");
  await privatePage.getByLabel("WhatsApp / telefone").fill("44999999999");
  await privatePage.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(privatePage).toHaveURL(/#entrega$/);
  await isolated.close();
  console.log("PASS cart and checkout without browser storage permissions");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: "PASS", screenshots: 13, cepRequests: requests.length, pageErrors: errors.length }));
} finally {
  await browser.close();
  if (fixtureCreated) {
    await unlink(fixturePath);
    await rmdir(fixtureDirectory).catch(() => {});
  }
}
