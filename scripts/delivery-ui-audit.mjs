import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3017";
const browser = await chromium.launch();
const errors = [];
await mkdir("artifacts/delivery-qa", { recursive: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    page.on("pageerror", error => errors.push(error.message));
    // Prevent visit tracking or accidental writes in both local and public QA.
    await page.route("**/api/**", route => route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 204 }));
    assert.equal((await page.goto(`${base}/delivery`, { waitUntil: "networkidle" })).status(), 200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://wimifarma.com.br/delivery");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /delivery-em-casa.webp$/);
    const hero = page.locator('figure img');
    await expect.poll(() => hero.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    assert.ok(await hero.evaluate(image => image.getBoundingClientRect().width / image.getBoundingClientRect().height > 1.3));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(await page.evaluate(() => document.querySelector('nav[aria-label="Caminho da página"]').getBoundingClientRect().top >= document.querySelector("header").getBoundingClientRect().bottom), "Fixed header must not cover the hero");
    await expect(page.getByRole("link", { name: "Escolher produtos" })).toHaveAttribute("href", "/catalogo");
    await expect(page.getByRole("link", { name: "Falar com a equipe" })).toHaveAttribute("href", /^https:\/\/wa.me\/5544984134971\?text=/);
    await page.screenshot({ path: `artifacts/delivery-qa/${base.includes("127.0.0.1") ? "local" : "live"}-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Consultar meu CEP" }).click();
    assert.ok(await page.evaluate(() => document.querySelector("#consultar-entrega").getBoundingClientRect().top >= document.querySelector("header").getBoundingClientRect().bottom), "Anchor target must clear the fixed header");
    const cep = page.getByRole("textbox", { name: "CEP", exact: true });
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(cep).toHaveAttribute("aria-invalid", "true");
    await cep.fill("87525000"); await cep.press("Enter");
    await expect(page.locator('#delivery-result')).toContainText("Entrega disponível em Ivaté");
    await expect(page.locator('#delivery-result')).toContainText("R$ 99,90");
    await cep.fill("01001000"); await cep.press("Enter");
    await expect(page.locator('#delivery-result')).toContainText("ainda nao disponivel");
    await expect(page.getByRole("link", { name: "Consultar no WhatsApp", exact: true })).toBeVisible();
    const question = page.locator("summary").filter({ hasText: "Como funciona o frete grátis?" });
    await question.focus(); await page.keyboard.press("Enter");
    await expect(question.locator("..")).toHaveAttribute("open", "");
    assert.ok(await question.evaluate(element => element.getBoundingClientRect().height >= 44));
    await page.keyboard.press("Enter");
    await expect(question.locator("..")).not.toHaveAttribute("open", "");
    console.log(JSON.stringify({ width, imageLoaded: true, overflow: false, postalCodes: ["invalid", "local", "outside"], keyboardFaq: true, reducedMotion: true, writes: 0 }));
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
