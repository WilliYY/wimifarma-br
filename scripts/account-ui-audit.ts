import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { accountHistory } from "./fixtures/account-data";
import type { OrderHistoryFilter } from "../src/features/orders/customer-orders";

async function main() {
  const base = "http://127.0.0.1:3017";
  const browser = await chromium.launch();
  const bundle = await build({ entryPoints: ["scripts/fixtures/qa-account-page.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });
  await fs.mkdir("artifacts/account-qa", { recursive: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      // Block analytics writes while loading the public shell as well.
      await page.route("**/api/**", route => route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 204 }));
      // Real public header and compiled site styles; the private panel uses only fixtures.
      await page.goto(`${base}/delivery`, { waitUntil: "networkidle" });
      const header = await page.locator("body > header, header.fixed").first().evaluate(el => el.outerHTML);
      const classes = await page.evaluate(() => ({ html: document.documentElement.className, body: document.body.className }));
      const files = (await fs.readdir(".next/static/css", { recursive: true })).filter(file => file.endsWith(".css"));
      const css = (await Promise.all(files.map(file => fs.readFile(`.next/static/css/${file}`, "utf8")))).join("\n");
      let failOrders = false, failProfile = true, updated = false;
      const writes: string[] = [];
      await page.route("**/*", async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== base) return route.abort();
        const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
        if (url.pathname === "/qa-account") return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="pt-BR" class="${classes.html}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"></head><body class="${classes.body}">${header}<main id="root"></main><script src="/qa.js"></script></body></html>` });
        if (url.pathname === "/qa.js") return route.fulfill({ contentType: "text/javascript", body: Buffer.from(bundle.outputFiles[0].contents) });
        if (url.pathname === "/qa.css") return route.fulfill({ contentType: "text/css", body: css });
        if (url.pathname === "/api/minha-conta/pedidos") {
          if (failOrders) return json({ message: "Não foi possível consultar os pedidos. Tente novamente." }, 503);
          const data = accountHistory(Number(url.searchParams.get("page")), url.searchParams.get("filter") as OrderHistoryFilter);
          if (updated && data.activeOrder) data.activeOrder = { ...data.activeOrder, status: "OUT_FOR_DELIVERY" };
          return json({ data });
        }
        if (req.method() !== "GET") {
          if (!["/api/minha-conta", "/api/minha-conta/password"].includes(url.pathname)) throw new Error(`Unexpected write ${url.pathname}`);
          writes.push(url.pathname);
          if (url.pathname === "/api/minha-conta" && failProfile) { failProfile = false; return route.abort("failed"); }
          return json({ data: req.postDataJSON() });
        }
        if (url.pathname.startsWith("/api/")) return json({});
        return route.continue();
      });
      await page.goto(`${base}/qa-account`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Olá, Ana." })).toBeVisible();
      assert.ok(await page.locator("main [data-brand-signature] img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0));
      const fits = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow at ${width}`);
      await fits();
      await page.screenshot({ path: `artifacts/account-qa/overview-${width}.png`, fullPage: true });
      updated = true;
      await page.getByRole("button", { name: "Atualizar andamento" }).click();
      await expect(page.getByText("Saiu para entrega", { exact: true })).toBeVisible();
      const nav = page.getByRole("navigation", { name: "Área da conta" });
      await nav.getByRole("button", { name: /Meus pedidos/ }).click();
      await expect(page.getByRole("heading", { name: "Meus pedidos" })).toBeVisible();
      assert.ok(await page.locator("#account-content").evaluate(el => el.getBoundingClientRect().top >= document.querySelector("header.fixed")!.getBoundingClientRect().bottom - 1));
      await page.getByRole("button", { name: "Próxima página de pedidos" }).click();
      await expect(page.getByText("Pedido cancelado", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Página anterior de pedidos" }).click();
      await page.getByRole("button", { name: /^Em andamento\s*2$/ }).click();
      await expect(page.getByRole("article")).toHaveCount(2);
      await expect(page.getByText("Pronto para retirada", { exact: true })).toBeVisible();
      const first = page.getByRole("article").first();
      await first.locator("summary").focus();
      await page.keyboard.press("Enter");
      await expect(first.getByText("Pagamento pendente", { exact: true })).toBeVisible();
      assert.match(await first.getByRole("link", { name: "Ajuda com este pedido" }).getAttribute("href") ?? "", /WF-TESTE-100/);
      await fits();
      await page.screenshot({ path: `artifacts/account-qa/history-${width}.png`, fullPage: true });
      failOrders = true;
      await page.getByRole("button", { name: "Atualizar pedidos" }).click();
      await expect(page.getByRole("alert")).toContainText("Tente novamente");
      await expect(page.getByRole("button", { name: "Atualizar pedidos" })).toBeEnabled();
      failOrders = false;
      await page.getByRole("button", { name: /^Concluídos\s*6$/ }).click();
      await expect(page.getByRole("alert")).toHaveCount(0);
      await page.getByRole("article").first().locator("summary").click();
      await expect(page.getByRole("link", { name: "Avaliar produtos" }).first()).toBeVisible();
      await nav.getByRole("button", { name: "Meus dados" }).click();
      await page.getByLabel("Nome", { exact: true }).fill("Ana Cliente Teste");
      await page.getByRole("button", { name: "Salvar meus dados" }).click();
      await expect(page.getByText("Não foi possível salvar. Verifique sua conexão e tente novamente.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Salvar meus dados" })).toBeEnabled();
      await page.getByRole("button", { name: "Salvar meus dados" }).click();
      await expect(page.getByText("Dados salvos.")).toBeVisible();
      await fits();
      await nav.getByRole("button", { name: "Segurança" }).click();
      await page.getByLabel("Criar senha", { exact: true }).fill("SenhaFicticia123!");
      await page.getByLabel("Confirmar senha", { exact: true }).fill("SenhaFicticia123!");
      await page.getByRole("button", { name: "Salvar senha" }).click();
      await expect(page.getByLabel("Senha atual", { exact: true })).toBeVisible();
      await fits();
      await nav.getByRole("button", { name: "Cashback", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Seu cashback" })).toBeVisible();
      await expect(page.getByText("Cashback da compra de demonstração")).toBeVisible();
      await fits();
      await page.goto(`${base}/qa-account?empty=1`);
      await expect(page.getByRole("heading", { name: "Seu cuidado começa com uma escolha" })).toBeVisible();
      await nav.getByRole("button", { name: /Meus pedidos/ }).click();
      await expect(page.getByRole("heading", { name: "Sua próxima compra começa aqui" })).toBeVisible();
      await fits();
      assert.deepEqual(errors, []);
      assert.equal(writes.length, 3);
      console.log(JSON.stringify({ width, history: true, tracking: true, pagination: true, filters: true, keyboard: true, forms: true, empty: true, retry: true, overflow: false, realWrites: 0 }));
      await page.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
