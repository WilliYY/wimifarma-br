import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3010";
const route = process.env.AUDIT_PATH || "/contato";
const outputDir = process.env.AUDIT_OUTPUT_DIR;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.clock.install();
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 90_000 });
  const bar = page.getByRole("region", { name: "Destaques da Wimifarma" });
  const link = bar.getByRole("link");
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button")).toHaveCount(0);
  await expect(bar).toHaveAttribute("data-theme", "delivery");
  assert.equal(await link.getAttribute("href"), "/delivery");
  assert.match(await link.innerText(), /Frete grátis/);
  assert.match(await link.innerText(), /R\$ 99,90/);
  assert.match(await link.innerText(), /Ivaté-PR/);
  const truck = bar.locator('[data-animation="truck"]');
  await expect(truck).toBeVisible();
  assert.ok(await truck.evaluate((node) => node.getAnimations({ subtree: true }).some((animation) => animation.playState === "running")));
  const before = await truck.evaluate((node) => getComputedStyle(node).transform);
  await page.waitForTimeout(360);
  assert.notEqual(await truck.evaluate((node) => getComputedStyle(node).transform), before, "truck moves");

  async function advance() {
    await page.mouse.move(5, 500);
    await page.clock.fastForward(7_100);
  }

  await advance();
  await expect(bar).toHaveAttribute("data-theme", "popular");
  assert.equal(await link.getAttribute("href"), "/farmacia-popular");
  await advance();
  await expect(bar).toHaveAttribute("data-theme", "cashback");
  assert.equal(await link.getAttribute("href"), "/minha-conta");
  assert.doesNotMatch(await link.innerText(), /Em breve/);
  await advance();
  await expect(bar).toHaveAttribute("data-theme", "delivery");

  await link.focus();
  await page.clock.fastForward(21_500);
  await expect(bar).toHaveAttribute("data-theme", "delivery");
  assert.equal(await link.evaluate((node) => node === document.activeElement), true);
  await page.keyboard.press("Tab");
  await advance();
  await expect(bar).toHaveAttribute("data-theme", "popular");
  await bar.hover();
  await page.waitForTimeout(550);
  assert.equal(await bar.locator("[data-copy]").evaluate((node) => getComputedStyle(node).opacity), "1", "pausing motion must not freeze text mid-transition");
  await page.clock.fastForward(14_500);
  await expect(bar).toHaveAttribute("data-theme", "popular");
  await advance();
  await expect(bar).toHaveAttribute("data-theme", "cashback");

  if (outputDir) await mkdir(outputDir, { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (let slide = 0; slide < 3; slide += 1) {
      await page.waitForTimeout(550);
      const geometry = await bar.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          height: bounds.height,
          overflow: element.scrollWidth > element.clientWidth,
          clipped: [...element.querySelectorAll("a, strong, [data-copy], [data-amount]")].some((child) => {
            const box = child.getBoundingClientRect();
            return box.width > 0 && (box.left < bounds.left - 1 || box.right > bounds.right + 1 || box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1 || child.scrollWidth > child.clientWidth + 1);
          }),
        };
      });
      assert.deepEqual(geometry, { height: 40, overflow: false, clipped: false }, `${width}px / slide ${slide}`);
      const theme = await bar.getAttribute("data-theme");
      if (outputDir) await page.screenshot({ path: `${outputDir}/${width}-${theme}.png`, clip: { x: 0, y: 0, width, height: 220 } });
      await advance();
    }
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(bar).toHaveAttribute("data-motion", "paused");
  const stationary = await link.innerText();
  await page.clock.fastForward(21_500);
  assert.equal(await link.innerText(), stationary);
  assert.equal(await bar.evaluate((node) => node.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length), 0);
  assert.deepEqual(errors, []);
  console.log("PASS: no controls, automatic 3-slide loop, animated truck, links, focus/hover pause with automatic resume, reduced motion, 12 responsive states at 40px, no clipping or JS errors.");
} finally {
  await browser.close();
}
