import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";

async function fixture(kind: "button" | "account" | "admin", run: (page: Page) => Promise<void>) {
  const cssDirectory = join(process.cwd(), ".next/static/css");
  const css = process.env.RESTOCK_UI_CAPTURE_ROOT && existsSync(cssDirectory) ? readdirSync(cssDirectory).filter(file => file.endsWith(".css")).map(file => readFileSync(join(cssDirectory, file), "utf8")).join("\n") : "";
  const mocks: Record<string, string> = { "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>" };
  const entry = kind === "button"
    ? "import {RestockButton} from './src/components/site/restock-button';root.render(<RestockButton product={{id:'synthetic-product',name:'Produto sintético',slug:'produto-sintetico'}}/>);"
    : kind === "account" ? "import {CustomerRestockPanel} from './src/components/site/customer-restock-panel';root.render(<CustomerRestockPanel/>);"
      : "import {RestockPanel} from './src/components/admin/restock-panel';root.render(<RestockPanel/>);";
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';const root=createRoot(document.getElementById('root'));${entry}`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "restock-fixture", setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }] });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:3197") return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      return route.abort();
    });
    try { await run(page); } catch (error) { if (errors.length) throw new Error(errors.join("; "), { cause: error }); throw error; }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

async function capture(page: Page, name: string) {
  const directory = process.env.RESTOCK_UI_CAPTURE_ROOT;
  if (!directory) return;
  mkdirSync(directory, { recursive: true });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(directory, `${name}-${width}.png`), fullPage: true });
  }
}

test("visitante recebe login com retorno ao produto, sem cadastro silencioso", async () => {
  await fixture("button", async page => {
    let writes = 0;
    await page.route("**/api/minha-conta/avisos-estoque?*", route => { if (route.request().method() !== "GET") writes++; return route.fulfill({ status: 401, json: { message: "Não autorizado." } }); });
    await page.goto("http://127.0.0.1:3197");
    await page.getByRole("button", { name: "Avise-me quando chegar" }).click();
    await expect(page.getByRole("link", { name: "Entrar ou criar conta" })).toHaveAttribute("href", "/login?callbackUrl=%2Fproduto%2Fproduto-sintetico");
    assert.equal(writes, 0);
  });
});

test("aviso exige canais e consentimento explícitos, sem contatos arbitrários no POST", async () => {
  await fixture("button", async page => {
    const submissions: unknown[] = [];
    await page.route("**/api/minha-conta/avisos-estoque*", route => {
      if (route.request().method() === "POST") { submissions.push(route.request().postDataJSON()); return route.fulfill({ json: { interest: { id: "synthetic-interest", status: "WAITING" } } }); }
      return route.fulfill({ json: { contact: { phone: "5544999990000", email: "cliente@example.com" }, interest: null, available: false } });
    });
    await page.goto("http://127.0.0.1:3197");
    await page.getByRole("button", { name: "Avise-me quando chegar" }).click();
    const save = page.getByRole("button", { name: "Quero receber o aviso" });
    await expect(save).toBeDisabled();
    await page.getByRole("checkbox", { name: /WhatsApp/ }).check();
    await page.getByRole("checkbox", { name: /E-mail/ }).check();
    await expect(save).toBeDisabled();
    await page.getByRole("checkbox", { name: /Autorizo a Wimifarma/ }).check();
    await capture(page, "escolha-canais");
    await save.click();
    await expect(page.getByText("Seu interesse está registrado")).toBeVisible();
    assert.deepEqual(submissions, [{ productId: "synthetic-product", whatsapp: true, email: true, consent: true }]);
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("button", { name: "Avise-me quando chegar" }).click();
    await expect(page.getByRole("checkbox", { name: /Autorizo a Wimifarma/ })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /WhatsApp/ })).not.toBeChecked();
  });
});

test("cliente cancela somente o aviso escolhido e a lista é atualizada", async () => {
  await fixture("account", async page => {
    let canceled = false;
    await page.route("**/api/minha-conta/avisos-estoque", route => {
      if (route.request().method() === "DELETE") { assert.deepEqual(route.request().postDataJSON(), { id: "synthetic-interest" }); canceled = true; return route.fulfill({ json: { interest: { id: "synthetic-interest", status: "CANCELED" } } }); }
      return route.fulfill({ json: { interests: [{ id: "synthetic-interest", status: canceled ? "CANCELED" : "WAITING", whatsapp: true, emailEnabled: false, expiresAt: "2026-11-19T12:00:00Z", available: false, product: { id: "synthetic-product", name: "Produto sintético", slug: "produto-sintetico" } }] } });
    });
    await page.goto("http://127.0.0.1:3197");
    await expect(page.getByText("Aguardando disponibilidade", { exact: true })).toBeVisible();
    await capture(page, "minha-conta");
    await page.getByRole("button", { name: "Cancelar aviso de Produto sintético" }).click();
    await expect(page.getByText("Aviso cancelado", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar aviso de Produto sintético" })).toHaveCount(0);
    assert.equal(canceled, true);
  });
});

test("painel revalida antes de abrir contato; cancelamento não abre destino nem marca envio", async () => {
  await fixture("admin", async page => {
    await page.addInitScript({ content: "window.popupState={closed:false,destinations:[]};window.open=function(){return {opener:null,document:{title:''},close:function(){window.popupState.closed=true;},location:{replace:function(url){window.popupState.destinations.push(url);}}};};" });
    let writes = 0;
    await page.route("**/api/admin/avisos-estoque*", route => {
      if (route.request().method() === "POST") { writes++; assert.deepEqual(route.request().postDataJSON(), { id: "synthetic-interest", channel: "WHATSAPP", updatedAt: "2026-10-19T12:00:00.000Z" }); return route.fulfill({ status: 409, json: { message: "Aviso atualizado. Recarregue a lista." } }); }
      assert.equal(route.request().method(), "GET");
      return route.fulfill({ json: { data: [{ id: "synthetic-interest", product: { id: "synthetic-product", name: "Produto sintético", slug: "produto-sintetico" }, customer: { name: "Cliente sintético" }, phone: "5544999990000", email: null, whatsapp: true, emailEnabled: false, whatsappNotifiedAt: null, emailNotifiedAt: null, createdAt: "2026-10-19T12:00:00Z", expiresAt: "2026-11-18T12:00:00Z", updatedAt: "2026-10-19T12:00:00.000Z", available: true }], counts: { waiting: 1, available: 1 }, page: 1, pages: 1, total: 1 } });
    });
    await page.goto("http://127.0.0.1:3197");
    await expect(page.getByRole("button", { name: "Marcar contato feito" })).toBeDisabled();
    await capture(page, "painel-equipe");
    await page.getByRole("button", { name: "Abrir WhatsApp" }).click();
    await expect(page.getByRole("alert")).toHaveText("Aviso atualizado. Recarregue a lista.");
    await expect(page.getByRole("button", { name: "Marcar contato feito" })).toBeDisabled();
    assert.equal(writes, 1);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { popupState: unknown }).popupState), { closed: true, destinations: [] });
  });
});
