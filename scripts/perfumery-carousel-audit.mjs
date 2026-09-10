import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3010";
const outputDir = process.env.AUDIT_OUTPUT_DIR;
const errors = [];
let popups = 0;
page.on("pageerror", (error) => errors.push(error.message));
page.on("popup", async (popup) => { popups += 1; await popup.close(); });

try {
  await page.clock.install();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const carousel = page.getByRole("region", { name: "Perfumaria e cuidados pessoais" });
  await carousel.waitFor({ timeout: 5000 });
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel.getByRole("button", { name: "Pausar banners de perfumaria" })).toBeEnabled();
  const next = carousel.getByRole("button", { name: "Próxima marca" });
  const previous = carousel.getByRole("button", { name: "Marca anterior" });
  const brand = () => carousel.locator("h2");
  await carousel.hover();
  await expect(brand()).toHaveText("Dove");
  await next.click();
  await expect(brand()).toHaveText("Rexona");
  await next.click();
  await expect(brand()).toHaveText("NIVEA");
  await next.click();
  await expect(brand()).toHaveText("Dove");
  await previous.click();
  await expect(brand()).toHaveText("NIVEA");

  await page.clock.fastForward(8_000);
  await expect(brand()).toHaveText("NIVEA");
  await carousel.getByRole("button", { name: "Iniciar banners de perfumaria" }).click();
  await page.mouse.move(1, 999);
  await page.clock.fastForward(7_100);
  await expect(brand()).toHaveText("Dove");
  await carousel.getByRole("button", { name: "Pausar banners de perfumaria" }).click();
  await page.mouse.move(1, 999);
  await page.clock.fastForward(8_000);
  await expect(brand()).toHaveText("Dove");

  if (outputDir) await mkdir(outputDir, { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await carousel.scrollIntoViewIfNeeded();
    await carousel.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    for (const name of ["Dove", "Rexona", "NIVEA"]) {
      await carousel.getByRole("button", { name: `Mostrar ${name}`, exact: true }).click();
      await expect(brand()).toHaveText(name);
      const link = carousel.getByRole("link", { name: `Consultar ${name} pelo WhatsApp` });
      const url = new URL(await link.getAttribute("href"));
      assert.equal(url.hostname, "wa.me");
      assert.match(url.searchParams.get("text"), new RegExp(name));
      await expect(carousel.locator("img")).toHaveJSProperty("complete", true);
      assert.ok(await carousel.locator("img").evaluate((img) => img.naturalWidth > 0));
      const geometry = await carousel.evaluate((root) => {
        const b = root.getBoundingClientRect();
        const elements = [...root.querySelectorAll("h2, p, a, button")];
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          clipped: elements.some((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1 || el.scrollWidth > el.clientWidth + 1);
          }),
        };
      });
      assert.deepEqual(geometry, { overflow: false, clipped: false }, `${width} / ${name}`);
      if (outputDir) await carousel.screenshot({ path: `${outputDir}/${width}-${name}.png`, animations: "disabled" });
    }
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(carousel.getByRole("button", { name: "Iniciar banners de perfumaria" })).toBeDisabled();
  await page.clock.fastForward(15_000);
  await expect(brand()).toHaveText("NIVEA");
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(brand()).toHaveText("Dove");

  const bounds = await carousel.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.65, bounds.y + 100);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.3, bounds.y + 102, { steps: 8 });
  await page.mouse.up();
  await expect(brand()).toHaveText("Rexona");

  const cta = await carousel.getByRole("link").boundingBox();
  await page.mouse.move(cta.x + cta.width - 5, cta.y + cta.height / 2);
  await page.mouse.down();
  await page.mouse.move(cta.x + 5, cta.y + cta.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(brand()).toHaveText("NIVEA");
  assert.equal(popups, 0, "Dragging a consultation link must not open WhatsApp");

  await page.setViewportSize({ width: 390, height: 1000 });
  await carousel.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  const touchBounds = await carousel.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const x = touchBounds.x + touchBounds.width * 0.85;
  const y = touchBounds.y + 100;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 140, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(brand()).toHaveText("Dove");
  await cdp.detach();
  assert.deepEqual(errors, []);
  console.log("PASS: Dove/Rexona/NIVEA, links, arrows, indicators, autoplay, pause, keyboard, mouse/touch drag, click suppression, reduced motion, images and 12 responsive states; no page errors.");
} finally {
  await browser.close();
}
