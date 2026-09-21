import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

// Actual admin components, isolated HTTP fixtures. Never connects to a database.
async function main() {
  const bundle = await build({ entryPoints: ["scripts/fixtures/qa-catalog-page.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });
  const css = (await Promise.all((await fs.readdir(".next/static/css")).filter(file => file.endsWith(".css")).map(file => fs.readFile(`.next/static/css/${file}`, "utf8")))).join("\n");
  const photo = await fs.readFile("public/banners/products/dove-original.webp");
  const previewDataUrl = `data:image/webp;base64,${photo.toString("base64")}`;
  const browser = await chromium.launch({ headless: true });
  await fs.mkdir("artifacts/assistant-qa", { recursive: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      const calls: string[] = [];
      let delay = false;
      await context.route("**/*", async route => {
        const req = route.request(); const url = new URL(req.url());
        if (url.hostname !== "127.0.0.1") return route.abort();
        const json = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
        if (url.pathname === "/admin/catalogos") return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"></head><body><div id="root"></div><script src="/qa.js"></script></body></html>' });
        if (url.pathname === "/qa.js") return route.fulfill({ contentType: "text/javascript", body: Buffer.from(bundle.outputFiles[0].contents) });
        if (url.pathname === "/qa.css") return route.fulfill({ contentType: "text/css", body: css });
        if (url.pathname === "/api/admin/imagens-produtos/sugestoes") {
          const form = await new Response(new Uint8Array(req.postDataBuffer()!), { headers: { "Content-Type": req.headers()["content-type"] } }).formData();
          const action = String(form.get("action")); calls.push(action);
          if (delay) await new Promise(resolve => setTimeout(resolve, 1500));
          if (action !== "analyze") return json({ data: { id: "art", kind: "generated", label: "Arte editorial", view: "other", previewDataUrl, width: 600, height: 600 } });
          return json({ data: { analysis: { name: "Dove Original", brand: "Dove", ean: null, productType: "hygiene", visibleView: "front", summary: "Embalagem analisada para teste isolado.", warnings: [] }, candidates: [{ id: "real", kind: "real", label: "Foto lateral", view: "side", previewDataUrl, width: 600, height: 600, sourceUrl: "https://www.dove.com/br/" }], warnings: [] } });
        }
        if (url.pathname === "/api/produtos/sugestoes") return json({ data: { name: "KitKat ao leite 41,5g", brand: "KitKat", ean: "7891000248768", category: "Chocolates", productType: "food", confidence: "high", identityMatch: "exact", activeIngredients: [], searchTerms: ["chocolate", "wafer"], description: "Chocolate para teste isolado.", warnings: [], sources: [{ title: "Nestle", url: "https://www.nestle.com.br/" }] } });
        if (req.method() !== "GET") { errors.push(`Unexpected write ${url.pathname}`); return route.abort(); }
        if (url.pathname === "/api/produtos" || url.pathname === "/api/admin/imagens-produtos") return json({ data: [], backgroundRemovalAvailable: false });
        return route.fulfill({ status: 404, body: "" });
      });
      await page.goto("http://127.0.0.1:3010/admin/catalogos");
      await page.getByRole("button", { name: "Novo produto" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("checkbox", { name: "Preenchimento automatico com IA" }).uncheck();
      await dialog.locator('[name="name"]').fill("Kit Kat - Chocolate");
      await dialog.locator('[name="ean"]').fill("7891000248768");
      await dialog.getByRole("button", { name: "Pesquisar agora" }).click();
      await expect(dialog.locator('[name="category"]')).toHaveValue("Chocolates");
      await expect(dialog.locator('[name="activeIngredients"]')).toHaveValue("");
      await expect(dialog.locator('[name="activeIngredients"]')).toHaveAttribute("placeholder", "Não se aplica a este tipo de produto");
      // Switch product in the unsaved form before photo tests.
      await dialog.locator('[name="name"]').fill("Dove Original");
      await dialog.locator('[name="brand"]').fill("Dove");
      await dialog.locator('[name="ean"]').fill("");
      await dialog.locator('[name="category"]').fill("Higiene pessoal");
      await dialog.getByLabel("Arquivo da foto do produto").setInputFiles({ name: "original.webp", mimeType: "image/webp", buffer: photo });
      const suggestions = dialog.getByRole("region", { name: "Sugestoes de fotos e artes" });
      await expect(suggestions.getByRole("button", { name: "Usar esta imagem" })).toBeVisible();
      assert.deepEqual(calls, ["analyze"]);
      await expect(dialog.getByRole("button", { name: /Escolher arquivo/ })).toContainText("original.webp");
      await suggestions.getByRole("button", { name: "Usar esta imagem" }).click();
      await expect(dialog.getByRole("button", { name: /Escolher arquivo/ })).toContainText("foto-real-side.webp");
      await expect(suggestions.getByRole("button", { name: "Escolhida" })).toBeVisible();
      await suggestions.getByRole("button", { name: "Criar arte editorial" }).click();
      await expect(suggestions.getByText("Arte gerada por IA · confira os rótulos")).toBeVisible();
      await suggestions.getByRole("button", { name: "Usar esta imagem" }).click();
      await expect(dialog.getByRole("button", { name: /Escolher arquivo/ })).toContainText("arte-ilustrativa-other.webp");
      await suggestions.getByRole("button", { name: "Ampliar Arte editorial" }).click();
      await expect(suggestions.getByRole("img", { name: "Sugestao ampliada para conferir embalagem" })).toBeVisible();
      await suggestions.getByRole("button", { name: "Fechar ampliação" }).click();
      await suggestions.getByRole("button", { name: "Usar foto original" }).click();
      await expect(dialog.getByRole("button", { name: /Escolher arquivo/ })).toContainText("original.webp");
      await suggestions.scrollIntoViewIfNeeded();
      const overflow = await dialog.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }));
      assert.ok(overflow.scroll <= overflow.client + 1, `Overflow ${width}: ${JSON.stringify(overflow)}`);
      const badButtons = await suggestions.locator("button").evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 1 || element.getBoundingClientRect().height < 44).map(element => element.textContent));
      assert.deepEqual(badButtons, [], "Buttons must fit their labels and have a 44px touch target");
      await page.screenshot({ path: `artifacts/assistant-qa/mobile-${width}.png` });
      // A late response for a previous identity must never overwrite the current form.
      delay = true;
      await suggestions.getByRole("button", { name: "Buscar fotos reais" }).click();
      await expect(suggestions.getByRole("status")).toBeVisible();
      await dialog.locator('[name="name"]').fill("Outra embalagem");
      await expect(suggestions.getByRole("status")).toHaveCount(0);
      await page.waitForTimeout(1700);
      await expect(suggestions.getByText("Embalagem analisada para teste isolado.")).toHaveCount(0);
      assert.equal(calls.filter(call => call === "analyze").length, 2, "Selection must not trigger automatic re-analysis");
      await suggestions.getByRole("button", { name: "Buscar fotos reais" }).click();
      await expect(suggestions.getByRole("status")).toBeVisible();
      await suggestions.getByRole("button", { name: "Cancelar", exact: true }).click();
      await expect(suggestions.getByRole("status")).toHaveCount(0);
      await page.waitForTimeout(1700);
      await expect(suggestions.getByText("Embalagem analisada para teste isolado.")).toHaveCount(0);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, overflow: false, photoSelection: true, artwork: true, originalPreserved: true, staleResponseIgnored: true, cancel: true, commercialWrites: 0 }));
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
