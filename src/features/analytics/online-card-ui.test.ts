import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";

test("online card renders on mobile/desktop and retains last valid count on failure before recovering to real zero", { timeout: 90_000 }, async () => {
  const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {OnlineVisitorsCard} from './src/components/admin/online-visitors-card';createRoot(document.getElementById('root')).render(<OnlineVisitorsCard initialCount={7} measuredAt='2026-10-24T12:00:00Z'/>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
  const css = (await postcss([tailwind()]).process(await fs.readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors: string[] = [];
      let count = 3;
      let unavailable = false;
      let queries = 0;
      page.on("pageerror", error => errors.push(error.message));
      await page.clock.install({ time: new Date("2026-10-24T12:00:00Z") });
      await page.route("**/*", route => {
        const url = new URL(route.request().url());
        if (url.origin !== "http://127.0.0.1:3199") return route.abort();
        if (url.pathname === "/api/admin/visitas/online") {
          queries++;
          return route.fulfill({ status: unavailable ? 503 : 200, json: unavailable ? { error: "indisponivel" } : { data: { online: count, windowSeconds: 120, measuredAt: "2026-10-24T12:00:00Z" } } });
        }
        if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
        if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
        return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body class="bg-surface-subtle p-4"><main id="root" class="mx-auto max-w-5xl"></main><script src="/fixture.js"></script></body></html>' });
      });
      await page.goto("http://127.0.0.1:3199");
      const card = page.getByRole("region", { name: "Visitantes online" });
      await expect(card.locator('[aria-live="polite"]')).toHaveText("3navegadores ativos");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`);
      if (process.env.DASHBOARD_SCREENSHOTS_DIR) {
        await fs.mkdir(process.env.DASHBOARD_SCREENSHOTS_DIR, { recursive: true });
        await page.screenshot({ path: `${process.env.DASHBOARD_SCREENSHOTS_DIR}/online-${width}.png`, fullPage: true });
      }
      unavailable = true;
      await page.clock.runFor(30_000);
      await expect(card).toContainText("Atualização indisponível");
      await expect(card.locator('[aria-live="polite"]')).toHaveText("3navegadores ativos");
      count = 0;
      unavailable = false;
      await page.clock.runFor(30_000);
      await expect(card.locator('[aria-live="polite"]')).toHaveText("0navegadores ativos");
      await expect(card).toContainText("Atualiza a cada 30 s");
      assert.ok(queries >= 3);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
