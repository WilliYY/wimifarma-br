import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

async function main() {
  const bundle = await build({ entryPoints: ["scripts/fixtures/qa-catalog-page.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });
  const css = (await Promise.all((await fs.readdir(".next/static/css", { recursive: true })).filter(file => file.endsWith(".css")).map(file => fs.readFile(`.next/static/css/${file}`, "utf8")))).join("\n");
  const browser = await chromium.launch();
  await fs.mkdir("artifacts/trash-qa", { recursive: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage(); const errors: string[] = [], writes: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      const fixture = { id: "fixture", name: "Chocolate fictício para teste isolado", slug: "fixture", brand: "Teste", category: "Chocolates", description: "Produto sintético de teste", price: "9.90", promotionalPrice: null, stock: 5, status: "ACTIVE", activeIngredients: [], searchTerms: [], cashbackEnabled: false, cashbackRateBps: 200, featuredPosition: null, imageUrl: null, updatedAt: "2026-09-22T15:00:00.000Z", createdAt: "2026-09-22T15:00:00.000Z" };
      let trashed = false, failDelete = true;
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.hostname !== "127.0.0.1") return route.abort();
        const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
        if (url.pathname === "/admin/catalogos") return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"></head><body><div id="root"></div><script src="/qa.js"></script></body></html>' });
        if (url.pathname === "/qa.js") return route.fulfill({ contentType: "text/javascript", body: Buffer.from(bundle.outputFiles[0].contents) });
        if (url.pathname === "/qa.css") return route.fulfill({ contentType: "text/css", body: css });
        if (url.pathname === "/api/produtos/fixture" && request.method() === "DELETE") {
          writes.push("DELETE"); assert.equal(request.postDataJSON().expectedUpdatedAt, fixture.updatedAt);
          if (failDelete) { failDelete = false; return json({ error: "Falha temporária de teste. Tente novamente." }, 503); }
          trashed = true; return json({ data: { purgeAt: "2026-11-22T15:00:00.000Z" } });
        }
        if (url.pathname === "/api/produtos/fixture/restaurar" && request.method() === "POST") {
          writes.push("RESTORE"); assert.equal(request.postDataJSON().expectedUpdatedAt, fixture.updatedAt);
          trashed = false; fixture.status = "DRAFT"; return json({ data: { id: fixture.id, status: "DRAFT" } });
        }
        if (request.method() !== "GET") throw new Error(`Unexpected mutation ${url.pathname}`);
        if (url.pathname === "/api/produtos") return json({ data: trashed ? [] : [fixture] });
        if (url.pathname === "/api/produtos/lixeira") return json({ data: trashed ? [{ ...fixture, deletedAt: fixture.updatedAt, purgeAt: "2026-11-22T15:00:00.000Z" }] : [], page: 1, hasMore: false });
        return route.fulfill({ status: 404, body: "" });
      });
      await page.goto("http://127.0.0.1:3010/admin/catalogos");
      await expect(page.getByText("Seus produtos preparados para o Google")).toBeVisible();
      await expect(page.getByText("Nesta lista: 1 publicados no site · 0 aptos para o catálogo Shopping")).toBeVisible();
      await page.getByRole("button", { name: "Excluir produto" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Cancelar" }).click(); assert.equal(writes.length, 0);
      await page.getByRole("button", { name: "Excluir produto" }).click();
      await dialog.getByRole("button", { name: "Mover para lixeira" }).click();
      await expect(dialog.getByRole("alert")).toContainText("Falha temporária");
      await dialog.getByRole("button", { name: "Mover para lixeira" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Excluir produto" })).toHaveCount(0);
      await page.getByRole("button", { name: "Lixeira", exact: true }).click();
      await expect(dialog.getByText(/Restaurar até 22\/11\/2026/)).toBeVisible();
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Dialog overflow ${width}`);
      await page.screenshot({ path: `artifacts/trash-qa/trash-${width}.png` });
      await dialog.getByRole("button", { name: "Restaurar", exact: true }).click();
      await expect(dialog.getByText("Nenhum produto na lixeira.")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByText("Rascunho", { exact: true }).last()).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow ${width}`);
      await page.screenshot({ path: `artifacts/trash-qa/catalog-${width}.png` });
      assert.deepEqual(writes, ["DELETE", "DELETE", "RESTORE"]); assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, cancellation: true, retry: true, restore: "draft", overflow: false, realData: false }));
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
