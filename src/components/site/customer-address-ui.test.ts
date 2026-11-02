import assert from "node:assert/strict";
import test from "node:test";
import type { ComponentProps } from "react";
import { build } from "esbuild";
import { chromium, expect, type Page } from "@playwright/test";
import type { CustomerAccountPanel } from "./customer-account-panel";
import { accountCustomer, accountHistory } from "../../../scripts/fixtures/account-data";

type Customer = ComponentProps<typeof CustomerAccountPanel>["customer"];
const emptyCustomer: Customer = { ...accountCustomer, address: null, neighborhood: null, city: "" };
const foundAddress = { postalCode: "80010000", street: "Rua Sintética", neighborhood: "Centro Sintético", city: "Curitiba", state: "PR" };
type PostalReply = typeof foundAddress;
type PostalFixture = { postalLookups: string[]; replyPostal: (index: number, data: PostalReply, status: number) => void };

async function lookups(page: Page) {
  return page.evaluate(() => (window as unknown as PostalFixture).postalLookups);
}

async function reply(page: Page, index: number, data: PostalReply, status = 200) {
  await page.evaluate(async ({ index, data, status }) => {
    (window as unknown as PostalFixture).replyPostal(index, data, status);
    await new Promise(requestAnimationFrame);
  }, { index, data, status });
}

async function fixture(customer: Customer, run: (page: Page) => Promise<void>) {
  const mocks: Record<string, string> = {
    "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>",
    "next/navigation": "export const useRouter=()=>({refresh:()=>{},replace:()=>{}})",
    "@/components/site/brand-signature": "export const BrandSignature=()=> <span>Wimifarma</span>",
    "@/components/site/club-benefits": "export const ClubBenefits=()=>null",
    "@/components/site/customer-restock-panel": "export const CustomerRestockPanel=()=>null",
    "./customer-store-credit": "export const CustomerStoreCredit=()=>null",
    "@/components/site/customer-order-history": "export const CustomerOrderCard=()=>null;export const CustomerOrderHistoryPanel=()=>null",
    "@/hooks/use-club-summary": "export const useClubSummary=()=>({summary:null})",
    "sonner": "export const toast={success:()=>{},error:()=>{}}",
  };
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {CustomerAccountPanel} from './src/components/site/customer-account-panel';createRoot(document.getElementById('root')).render(<CustomerAccountPanel cashback={null} customer={${JSON.stringify(customer)}} initialOrders={${JSON.stringify(accountHistory(1, "all", true))}}/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "customer-address-fixture", setup(builder) {
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
      if (url.origin !== "http://127.0.0.1:3195") return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<div id="root"></div><script>
        window.postalLookups=[];const pending=[];const originalFetch=window.fetch.bind(window);
        window.fetch=(input,options)=>{
          const url=new URL(input,location.href);
          if(!url.pathname.startsWith('/api/cep/'))return originalFetch(input,options);
          window.postalLookups.push(url.pathname.split('/').pop());
          // Deliberately ignore AbortSignal: even a late provider must not replace the current address.
          return new Promise(resolve=>pending.push(resolve));
        };
        window.replyPostal=(index,data,status)=>pending[index](new Response(JSON.stringify({data}),{status,headers:{'Content-Type':'application/json'}}));
        </script><script type="module" src="/fixture.js"></script>` });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname.startsWith("/api/cep/")) return route.fulfill({ json: { data: foundAddress } });
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3195/#perfil");
    await expect(page.getByRole("button", { name: "Salvar meus dados" })).toBeVisible();
    await run(page);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test("perfil novo mantém endereço, cidade, CEP e UF vazios", async () => {
  await fixture(emptyCustomer, async page => {
    for (const label of ["Endereço", "Bairro", "Cidade", "CEP", "UF"]) await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
  });
});

test("consulta de CEP preserva todos os campos do endereço salvo", async () => {
  const saved = { ...emptyCustomer, address: "Rua Preservada, 100, apto 2", neighborhood: "Bairro Preservado", city: "Cidade Preservada" };
  await fixture(saved, async page => {
    await page.getByLabel("CEP", { exact: true }).fill("80010000");
    await expect(page.getByLabel("CEP", { exact: true })).toHaveValue("80010-000");
    await expect.poll(() => lookups(page)).toEqual(["80010000"]);
    await reply(page, 0, foundAddress);
    await expect(page.getByLabel("Endereço", { exact: true })).toHaveValue(saved.address);
    await expect(page.getByLabel("Bairro", { exact: true })).toHaveValue(saved.neighborhood);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue(saved.city);
    await expect(page.getByLabel("UF", { exact: true })).toHaveValue("PR");
  });
});

test("CEP completo preenche os campos vazios e permite autocomplete do navegador", async () => {
  await fixture(emptyCustomer, async page => {
    for (const [label, autoComplete, name] of [
      ["CEP", "postal-code", "postalCode"], ["Endereço", "street-address", "address"],
      ["Bairro", "address-level3", "neighborhood"], ["Cidade", "address-level2", "city"], ["UF", "address-level1", "state"],
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("autocomplete", autoComplete);
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("name", name);
    }
    await page.getByLabel("CEP", { exact: true }).fill("80010-00");
    await page.getByLabel("Nome", { exact: true }).focus();
    assert.deepEqual(await lookups(page), []);
    await page.getByLabel("CEP", { exact: true }).fill("80010000");
    await expect.poll(() => lookups(page)).toEqual(["80010000"]);
    await reply(page, 0, foundAddress);
    await expect(page.getByLabel("Endereço", { exact: true })).toHaveValue(foundAddress.street);
    await expect(page.getByLabel("Bairro", { exact: true })).toHaveValue(foundAddress.neighborhood);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue(foundAddress.city);
    await expect(page.getByLabel("UF", { exact: true })).toHaveValue(foundAddress.state);
  });
});

test("resposta pendente preserva edição manual e campo apagado pelo cliente", async () => {
  await fixture(emptyCustomer, async page => {
    await page.getByLabel("CEP", { exact: true }).fill("80010000");
    await expect.poll(() => lookups(page)).toEqual(["80010000"]);
    await page.getByLabel("Endereço", { exact: true }).fill("Rua Manual, 100, apto 2");
    await page.getByLabel("Cidade", { exact: true }).fill("Cidade Manual");
    await page.getByLabel("Cidade", { exact: true }).fill("");
    await page.getByLabel("UF", { exact: true }).fill("SC");
    await reply(page, 0, foundAddress);
    await expect(page.getByLabel("Endereço", { exact: true })).toHaveValue("Rua Manual, 100, apto 2");
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("UF", { exact: true })).toHaveValue("SC");
    await expect(page.getByLabel("Bairro", { exact: true })).toHaveValue(foundAddress.neighborhood);
  });
});

test("CEP alterado ignora resposta atrasada e preserva somente o resultado atual", async () => {
  await fixture(emptyCustomer, async page => {
    await page.getByLabel("CEP", { exact: true }).fill("80010000");
    await expect.poll(() => lookups(page)).toEqual(["80010000"]);
    await page.getByLabel("CEP", { exact: true }).fill("01001000");
    await expect.poll(() => lookups(page)).toEqual(["80010000", "01001000"]);
    const current = { ...foundAddress, postalCode: "01001000", street: "Rua Atual", city: "São Paulo", state: "SP" };
    await reply(page, 1, current);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("São Paulo");
    await reply(page, 0, foundAddress);
    await expect(page.getByLabel("CEP", { exact: true })).toHaveValue("01001-000");
    await expect(page.getByLabel("Endereço", { exact: true })).toHaveValue(current.street);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("São Paulo");
    await expect(page.getByLabel("UF", { exact: true })).toHaveValue("SP");
  });
});

test("novo CEP limpa somente valores da consulta anterior e mantém endereço editado", async () => {
  await fixture(emptyCustomer, async page => {
    await page.getByLabel("CEP", { exact: true }).fill("80010000");
    await expect.poll(() => lookups(page)).toEqual(["80010000"]);
    await reply(page, 0, foundAddress);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Curitiba");
    await page.getByLabel("Endereço", { exact: true }).fill("Rua Confirmada, 42");
    await page.getByLabel("CEP", { exact: true }).fill("01001000");
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("UF", { exact: true })).toHaveValue("");
    await expect.poll(() => lookups(page)).toEqual(["80010000", "01001000"]);
    await reply(page, 1, { ...foundAddress, postalCode: "01001000", city: "São Paulo", state: "SP" });
    await expect(page.getByLabel("Endereço", { exact: true })).toHaveValue("Rua Confirmada, 42");
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("São Paulo");
  });
});

test("resposta com outro CEP não preenche e permite repetir a consulta", async () => {
  await fixture(emptyCustomer, async page => {
    await page.getByLabel("CEP", { exact: true }).fill("80010000");
    await expect.poll(() => lookups(page)).toEqual(["80010000"]);
    await reply(page, 0, { ...foundAddress, postalCode: "01001000" });
    await expect(page.getByRole("status")).toContainText("Resposta de CEP inválida");
    for (const label of ["Endereço", "Bairro", "Cidade", "UF"]) await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Consultar CEP novamente" }).click();
    await expect.poll(() => lookups(page)).toEqual(["80010000", "80010000"]);
    await reply(page, 1, foundAddress);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Curitiba");
  });
});

test("salvar consolida o endereço, sem persistir CEP/UF nem apagar dados ao limpar a consulta", async () => {
  await fixture(emptyCustomer, async page => {
    let saved: Record<string, unknown> | null = null;
    await page.route("**/api/minha-conta", route => { saved = route.request().postDataJSON(); return route.fulfill({ json: { data: saved } }); });
    await page.getByLabel("CEP", { exact: true }).fill("80010000");
    await expect.poll(() => lookups(page)).toEqual(["80010000"]);
    await reply(page, 0, foundAddress);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Curitiba");
    await page.getByRole("button", { name: "Salvar meus dados" }).click();
    await expect.poll(() => saved !== null).toBe(true);
    await expect(page.getByRole("button", { name: "Salvar meus dados" })).toBeEnabled();
    assert.equal((saved as Record<string, unknown> | null)?.city, "Curitiba");
    for (const key of ["postalCode", "state"]) assert.equal(Object.hasOwn(saved!, key), false);
    await page.getByLabel("CEP", { exact: true }).fill("");
    await expect(page.getByLabel("Endereço", { exact: true })).toHaveValue(foundAddress.street);
    await expect(page.getByLabel("Bairro", { exact: true })).toHaveValue(foundAddress.neighborhood);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Curitiba");
    await expect(page.getByLabel("UF", { exact: true })).toHaveValue("");
  });
});

test("salvamento pendente não consolida sugestões que não foram enviadas", async () => {
  await fixture(emptyCustomer, async page => {
    let releaseSave: (() => Promise<void>) | null = null;
    await page.route("**/api/minha-conta", route => { releaseSave = () => route.fulfill({ json: { data: {} } }); });
    await page.getByLabel("CEP", { exact: true }).fill("80010000");
    await expect.poll(() => lookups(page)).toEqual(["80010000"]);
    await page.getByRole("button", { name: "Salvar meus dados" }).click();
    await expect.poll(() => releaseSave !== null).toBe(true);
    await reply(page, 0, foundAddress);
    await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Curitiba");
    await (releaseSave as unknown as () => Promise<void>)();
    await expect(page.getByRole("button", { name: "Salvar meus dados" })).toBeEnabled();
    await page.getByLabel("CEP", { exact: true }).fill("");
    for (const label of ["Endereço", "Bairro", "Cidade", "UF"]) await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
  });
});
