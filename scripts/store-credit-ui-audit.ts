import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

async function main() {
  const output = process.env.STORE_CREDIT_QA_OUTPUT;
  if (!output) throw new Error("Set STORE_CREDIT_QA_OUTPUT to the task temporary directory.");
  await fs.mkdir(output, { recursive: true });
  const bundle = await build({ entryPoints: ["scripts/fixtures/qa-store-credit-page.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });
  const files = (await fs.readdir(".next/static/css", { recursive: true })).filter(file => file.endsWith(".css"));
  assert.ok(files.length, "Built CSS is required for responsive UI verification");
  const css = (await Promise.all(files.map(file => fs.readFile(`.next/static/css/${file}`, "utf8")))).join("\n");
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      const pageErrors: string[] = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      let decisionCount = 0, failDecision = false, available = 1200, review = false;
      const writes: { path: string; body: Record<string, unknown> }[] = [];
      await page.route("**/*", async route => {
        const req = route.request(), url = new URL(req.url());
        const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
        if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"></head><body><div id="root"></div><script src="/qa.js"></script></body></html>' });
        if (url.pathname === "/qa.js") return route.fulfill({ contentType: "text/javascript", body: Buffer.from(bundle.outputFiles[0].contents) });
        if (url.pathname === "/qa.css") return route.fulfill({ contentType: "text/css", body: css });
        if (url.pathname === "/api/minha-conta/creditos") return json({ data: { balanceCents: available, availableCents: available, reservedCents: 0, reviewRequired: review, transactions: [{ id: "transaction-synthetic", kind: "ISSUE", amountCents: 1200, description: "Item indisponível · pedido sintético", createdAt: "2026-10-20T10:00:00Z" }] } });
        if (req.method() === "POST") {
          const body = req.postDataJSON(); writes.push({ path: url.pathname, body });
          if (url.pathname.startsWith("/api/pedidos/")) return json({ data: {} });
          decisionCount += 1;
          if (failDecision) return json({ error: "Conflito de versão. Atualize o pedido." }, 409);
          return json({ data: { id: "shortage-synthetic", orderItemId: "item-synthetic", productName: "Produto sintético", quantity: 1, cashPaidCents: 980, cashbackReturnCents: 100, wimicoinsReturnPoints: 20, storeCreditReturnCents: 200, version: 2, status: body.decision === "ACCEPT_CREDIT" ? "CREDIT_ACCEPTED" : "REFUND_REQUESTED", creditState: body.decision === "ACCEPT_CREDIT" ? "ISSUED" : "NONE", createdAt: "2026-10-20T10:00:00Z", decidedAt: "2026-10-20T11:00:00Z" } });
        }
        return route.abort();
      });
      const fits = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${width}`);
      await page.goto("http://store-credit.test/");
      await expect(page.getByRole("button", { name: "Aceitar crédito" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Solicitar reembolso" })).toBeEnabled();
      await expect(page.getByText("Cashback a devolver ao aceitar crédito: R$ 1,00.")).toBeVisible();
      await expect(page.getByText(/Cashback devolvido|WimiCoins devolvidos/)).toHaveCount(0);
      await page.getByRole("checkbox", { name: "Usar saldo de crédito de compra" }).check();
      await expect(page.getByTestId("selected")).toHaveText("1200");
      await page.getByRole("spinbutton", { name: "Valor do crédito em reais" }).fill("5.50");
      await expect(page.getByTestId("selected")).toHaveText("550");
      available = 300;
      await page.getByRole("button", { name: "Atualizar crédito", exact: true }).click();
      await expect(page.getByTestId("selected")).toHaveText("0");
      await page.getByRole("checkbox", { name: "Usar saldo de crédito de compra" }).check();
      await expect(page.getByTestId("selected")).toHaveText("300");
      await page.getByRole("button", { name: "Trocar conta sintética" }).click();
      await expect(page.getByTestId("selected")).toHaveText("0");
      review = true;
      await page.getByRole("button", { name: "Atualizar crédito", exact: true }).click();
      await expect(page.getByRole("checkbox", { name: "Usar saldo de crédito de compra" })).toBeDisabled();
      await page.getByRole("checkbox", { name: /Aceito receber crédito/ }).check();
      await page.getByRole("button", { name: "Aceitar crédito" }).dblclick();
      await expect(page.getByText(/Crédito aceito para 1 unidade/)).toBeVisible();
      await expect(page.getByText("Cashback devolvido: R$ 1,00.")).toBeVisible();
      assert.equal(decisionCount, 1);
      assert.equal(writes[0].body.consent, true);
      await fits();
      await page.screenshot({ path: path.join(output, `credit-${width}.png`), fullPage: true });
      await page.reload();
      await page.getByRole("button", { name: "Solicitar reembolso" }).click();
      await expect(page.getByText("Reembolso solicitado. A equipe acompanha a devolução pelo meio de pagamento.")).toBeVisible();
      await expect(page.getByText(/Cashback devolvido|WimiCoins devolvidos/)).toHaveCount(0);
      assert.equal(writes[1].body.consent, undefined);
      await page.reload(); failDecision = true;
      await page.getByRole("button", { name: "Solicitar reembolso" }).click();
      await expect(page.getByRole("alert")).toContainText("Conflito de versão");
      assert.equal(decisionCount, 3);
      await page.getByText("Registrar falta da distribuidora", { exact: true }).click();
      const quantity = page.getByRole("spinbutton", { name: /Quantidade faltante de/ });
      assert.equal(await quantity.getAttribute("max"), "2");
      await quantity.fill("3");
      await expect(page.getByRole("button", { name: "Propor escolha ao cliente" })).toBeDisabled();
      await quantity.fill("1");
      await page.getByRole("button", { name: "Propor escolha ao cliente" }).click();
      await expect(page.getByText(/Proposta registrada/)).toBeVisible();
      assert.deepEqual(writes.at(-1)?.body, { orderItemId: "item-synthetic", quantity: 1, expectedUpdatedAt: "2026-10-20T10:00:00Z" });
      await page.goto("http://store-credit.test/?reversed&staff");
      await expect(page.getByText(/Crédito aceito para 1 unidade/)).toBeVisible();
      await expect(page.getByText(/Crédito revisto após atualização financeira/)).toBeVisible();
      await expect(page.getByText("Registrar falta da distribuidora", { exact: true })).toHaveCount(0);
      await page.goto("http://store-credit.test/?review");
      await expect(page.getByText("Crédito em conferência. Fale com a equipe para acompanhar.", { exact: true }).first()).toBeVisible();
      await fits(); assert.deepEqual(pageErrors, []);
      await page.close();
      console.log(`PASS ${width}px: consent, refund, credit amount, balance refresh, identity switch, review, errors, no duplicate, admin bounds, no overflow`);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
