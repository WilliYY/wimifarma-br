import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3010";
const outputDir = process.env.AUDIT_OUTPUT_DIR;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.clock.install();
  await page.goto(`${baseUrl}/contato`, { waitUntil: "networkidle", timeout: 90_000 });
  const bar = page.getByRole("region", { name: "Destaques da Wimifarma" });
  await bar.waitFor({ timeout: 5_000 });
  const next = bar.getByRole("button", { name: "Próximo aviso" });
  const previous = bar.getByRole("button", { name: "Aviso anterior" });
  const link = bar.getByRole("link");

  await bar.getByRole("button", { name: "Pausar rotação dos avisos" }).click();
  await page.mouse.move(5, 500);
  await page.clock.fastForward(6_500);
  assert.match(await link.innerText(), /Frete grátis em Ivaté-PR/);
  await expect(bar.getByRole("button", { name: "Iniciar rotação dos avisos" })).toBeVisible();

  await bar.hover();
  await next.click();
  assert.match(await link.innerText(), /Farmácia Popular/);
  assert.equal(await link.getAttribute("href"), "/farmacia-popular");
  await next.click();
  assert.match(await link.innerText(), /Cashback Wimifarma/);
  assert.match(await link.innerText(), /Em breve/);
  await next.click();
  assert.match(await link.innerText(), /Frete grátis em Ivaté-PR/);
  assert.equal(await link.getAttribute("href"), "/delivery");
  await previous.click();
  assert.match(await link.innerText(), /Cashback Wimifarma/);

  // Focus pauses rotation; an explicit play action resumes it after hover ends.
  await page.clock.fastForward(6_500);
  assert.match(await link.innerText(), /Cashback Wimifarma/);
  await bar.getByRole("button", { name: "Iniciar rotação dos avisos" }).click();
  await page.mouse.move(5, 500);
  await page.clock.fastForward(6_100);
  assert.match(await link.innerText(), /Frete grátis em Ivaté-PR/);
  await bar.hover();
  await page.clock.fastForward(6_500);
  assert.match(await link.innerText(), /Frete grátis em Ivaté-PR/);

  if (outputDir) await mkdir(outputDir, { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (let slide = 0; slide < 3; slide += 1) {
      const geometry = await bar.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          height: bounds.height,
          overflow: element.scrollWidth > element.clientWidth,
          clipped: [...element.querySelectorAll("a, button, strong")].some((child) => {
            const box = child.getBoundingClientRect();
            return box.width > 0 && (box.left < bounds.left || box.right > bounds.right || box.top < bounds.top || box.bottom > bounds.bottom || child.scrollWidth > child.clientWidth + 1);
          }),
        };
      });
      assert.deepEqual(geometry, { height: 40, overflow: false, clipped: false }, `${width}px / slide ${slide}`);
      if (outputDir) await page.screenshot({ path: `${outputDir}/${width}-${slide}.png`, animations: "disabled", clip: { x: 0, y: 0, width, height: 220 } });
      await next.click();
    }
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(bar.getByRole("button", { name: "Iniciar rotação dos avisos" })).toBeDisabled();
  await page.mouse.move(5, 500);
  const stationary = await link.innerText();
  await page.clock.fastForward(12_500);
  assert.equal(await link.innerText(), stationary);
  await next.focus();
  await page.keyboard.press("Enter");
  assert.notEqual(await link.innerText(), stationary);
  assert.deepEqual(errors, []);
  console.log("PASS: 3 announcements, links, wraparound, autoplay, pause, reduced motion, keyboard and 12 responsive states (40px, no clipping). No page errors.");
} finally {
  await browser.close();
}
