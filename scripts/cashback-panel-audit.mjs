import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.CASHBACK_AUDIT_URL || "http://127.0.0.1:3010";
assert.equal(new URL(base).hostname, "127.0.0.1", "mock audit is local only");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const products = Array.from({ length: 26 }, (_, i) => ({
  id: `fixture-${i}`, name: `Produto teste ${String(i + 1).padStart(2, "0")}`, brand: "Marca de teste", imageUrl: "/brand/logo-wimifarma.svg",
  status: "ACTIVE", price: "20.00", promotionalPrice: null, cashbackEnabled: false, cashbackRateBps: 200,
  updatedAt: "2026-09-11T12:00:00.000Z", isPopularPharmacy: false, requiresPrescription: i === 23,
}));
let mode = "success";
let mutations = 0;
let version = 0;

try {
  await page.route("**/api/cashback**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const filtered = products.filter((p) => p.name.toLowerCase().includes(q) && (url.searchParams.get("enabled") !== "true" || p.cashbackEnabled));
      const n = Number(url.searchParams.get("page") || 1);
      return route.fulfill({ json: { data: filtered.slice((n - 1) * 24, n * 24), total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / 24)), active: products.filter((p) => p.cashbackEnabled).length, pendingCents: 0 } });
    }
    mutations++;
    const data = request.postDataJSON();
    const product = products.find((p) => p.id === url.pathname.split("/").at(-1));
    assert.ok(product);
    assert.equal(data.expectedUpdatedAt, product.updatedAt, "uses newest revision for every save");
    if (mode === "empty500") return route.fulfill({ status: 500, body: "" });
    if (mode === "conflict") {
      product.updatedAt = new Date(Date.UTC(2026, 8, 11, 12, 1, ++version)).toISOString();
      return route.fulfill({ status: 409, json: { error: "Produto alterado. Atualize a lista." } });
    }
    Object.assign(product, { cashbackEnabled: data.cashbackEnabled, cashbackRateBps: data.cashbackRateBps, updatedAt: new Date(Date.UTC(2026, 8, 11, 12, 1, ++version)).toISOString() });
    if (mode === "empty200") return route.fulfill({ status: 200, body: "" });
    return route.fulfill({ json: { data: product } });
  });
  await page.goto(`${base}/qa-cashback`, { waitUntil: "networkidle", timeout: 90000 });
  const card = page.getByRole("article", { name: products[0].name, exact: true });
  const toggle = card.getByRole("checkbox");
  const rate = card.getByRole("combobox");
  await expect(page.getByRole("article")).toHaveCount(24);
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(rate).toBeEnabled();
  await expect(rate).toHaveValue("200");
  await expect(card.getByText(/R\$\s*0,40/)).toBeVisible();
  await rate.selectOption("500");
  await expect(rate).toHaveValue("500");
  await expect(rate).toBeEnabled();
  await rate.selectOption("custom");
  await card.getByRole("spinbutton").fill("2.5");
  await card.getByRole("button").click();
  await expect(rate).toHaveValue("250");
  await expect(card.getByText(/R\$\s*0,50/)).toBeVisible();
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toBeEnabled();

  for (const failure of ["empty500", "conflict", "empty200"]) {
    mode = failure;
    await toggle.click();
    await expect(page.getByText(failure === "empty500" ? /Cashback temporariamente indisponivel/ : failure === "conflict" ? /Produto alterado/ : /Nao foi possivel confirmar a resposta/).first()).toBeVisible();
    await expect(toggle).toBeEnabled();
    await expect(toggle).toBeChecked({ checked: failure === "empty200" });
    mode = "success";
  }
  await rate.selectOption("300");
  await expect(rate).toHaveValue("300");
  await expect(rate).toBeEnabled();
  assert.equal(products[0].cashbackRateBps, 300);
  await expect(page.getByRole("article", { name: products[23].name }).getByRole("checkbox")).toBeDisabled();

  await page.getByLabel("Apenas com cashback").check();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(page.getByText("Nenhum produto encontrado.")).toBeVisible();
  await page.getByLabel("Apenas com cashback").uncheck();
  await expect(page.getByRole("article")).toHaveCount(24);
  await page.getByRole("button", { name: "Proxima pagina" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByLabel("Buscar produto").fill("teste 01");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByLabel("Buscar produto").fill("");
  await expect(page.getByRole("article")).toHaveCount(24);
  await mkdir("artifacts/cashback-panel-audit", { recursive: true });
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `artifacts/cashback-panel-audit/${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `overflow ${width}`);
    const columns = await page.locator("[data-cashback-grid]").evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
    assert.equal(columns, width >= 1280 ? 2 : 1, `columns ${width}`);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, mutations, checks: "inline checkbox, presets/custom, updated revisions, empty500/conflict/empty200 reconciliation, restrictions, pagination/filter, 5 viewports, 2 desktop columns, zero JS errors" }));
} finally { await browser.close(); }
