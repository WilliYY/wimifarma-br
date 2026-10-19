import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";

async function fixture(run: (page: Page) => Promise<void>) {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>",
    "@/components/site/brand-signature": "export const BrandSignature=()=> <span>WimiFarma</span>",
    "next/navigation": "export const useRouter=()=>({push:path=>window.destinations.push(path),refresh:()=>{}})",
    "next-auth/react": "export const getProviders=async()=>({});export const getSession=async()=>({user:{role:'CUSTOMER'}});export async function signIn(provider,data){window.signInCalls.push({provider,data});if(window.failLogin)throw new Error('Synthetic offline');return {error:null};}",
    "sonner": "export const toast={success:()=>{},info:()=>{},error:()=>{}}",
  };
  const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {CustomerAuthPage} from './src/components/site/customer-auth-page';createRoot(document.getElementById('root')).render(<CustomerAuthPage callbackUrl='/produto/sintetico'/>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "auth-fixture", setup(builder) {
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
      if (url.origin !== "http://127.0.0.1:3196") return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script>window.destinations=[];window.signInCalls=[];window.failLogin=false;</script><script type="module" src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      return route.abort();
    });
    try { await run(page); } catch (error) { if (errors.length) throw new Error(errors.join("; "), { cause: error }); throw error; }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test("login mostra senha sem perder valor e mantém o retorno autorizado", async () => {
  await fixture(async page => {
    await page.goto("http://127.0.0.1:3196");
    const form = page.getByRole("form", { name: "Entrar na conta" });
    await form.getByLabel("E-mail ou usuário").fill("cliente@example.invalid");
    await form.getByPlaceholder("Digite sua senha").fill("SenhaSintetica123");
    await form.getByRole("button", { name: "Mostrar senha", exact: true }).click();
    await expect(form.getByPlaceholder("Digite sua senha")).toHaveAttribute("type", "text");
    await form.getByRole("button", { name: "Ocultar senha", exact: true }).click();
    await form.getByRole("button", { name: "Entrar na minha conta" }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { destinations: string[] }).destinations)).toEqual(["/produto/sintetico"]);
    const calls = await page.evaluate(() => (window as unknown as { signInCalls: unknown[] }).signInCalls);
    assert.deepEqual(calls, [{ provider: "credentials", data: { email: "cliente@example.invalid", password: "SenhaSintetica123", redirect: false } }]);
  });
});

test("falha de conexão libera botão e preserva campos para nova tentativa", async () => {
  await fixture(async page => {
    await page.goto("http://127.0.0.1:3196");
    await page.evaluate(() => { (window as unknown as { failLogin: boolean }).failLogin = true; });
    const form = page.getByRole("form", { name: "Entrar na conta" });
    await form.getByLabel("E-mail ou usuário").fill("sintetico");
    await form.getByPlaceholder("Digite sua senha").fill("sintetica");
    await form.getByRole("button", { name: "Entrar na minha conta" }).click();
    await expect(page.getByRole("alert")).toContainText("Não foi possível conectar");
    await expect(form.getByRole("button", { name: "Entrar na minha conta" })).toBeEnabled();
    await expect(form.getByLabel("E-mail ou usuário")).toHaveValue("sintetico");
    await expect(form.getByPlaceholder("Digite sua senha")).toHaveValue("sintetica");
  });
});

test("cadastro exige confirmação igual e não transmite dados quando senhas divergem", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/minha-conta/register", route => { requests++; return route.fulfill({ status: 422, json: { message: "Erro sintético" } }); });
    await page.goto("http://127.0.0.1:3196");
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    const form = page.getByRole("form", { name: "Criar conta" });
    await form.getByLabel("Nome", { exact: true }).fill("Cliente sintético");
    await form.getByLabel("E-mail", { exact: true }).fill("cliente@example.invalid");
    await form.getByLabel("Telefone", { exact: true }).fill("44999990000");
    await form.getByPlaceholder("Crie sua senha").fill("SenhaSintetica123");
    await form.getByPlaceholder("Repita sua senha").fill("SenhaDiferente123");
    await form.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByRole("alert")).toHaveText("As senhas precisam ser iguais.");
    assert.equal(requests, 0);
    await expect(page.getByRole("form", { name: "Entrar na conta" })).toBeHidden();
  });
});
