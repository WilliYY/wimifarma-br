import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium, expect, type Page, type Route } from "@playwright/test";
import type { CartProduct } from "./cart-provider";

const origin = "http://127.0.0.1:3198";
const product: CartProduct = {
  id: "synthetic-product", slug: "produto-sintetico", name: "Produto sintético",
  imageUrl: null, category: null, unitPriceCents: 2590, originalPriceCents: 2990,
  stock: 10, requiresPrescription: false, isPopularPharmacy: false,
};
const quote = {
  provider: "melhor-envio", serviceId: 1, carrier: "Correios", service: "PAC",
  priceCents: 1875, deliveryDays: 4, token: "synthetic-quote-token",
};

function quotePayload(route: Route, options: (typeof quote & { benefit?: unknown })[]) {
  return route.request().url().endsWith('/estimativa')
    ? { data: { mode: 'available', options: options.map(({ token: _token, ...option }) => { void _token; return option; }) } }
    : { data: options };
}

async function fixture(run: (page: Page) => Promise<void>, cartOnly = false, fixtureProduct = product, purchasePanel = false, initialPostalCode = "") {
  const bundle = await build({
    stdin: {
      contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
        import {CartProvider,useCart} from './src/components/site/cart-provider';
        import {DeliveryEstimator} from './src/components/site/delivery-estimator';
        ${purchasePanel ? "import {Toaster} from 'sonner';import {ProductQuantityProvider} from './src/components/site/product-quantity';import {ProductPurchasePanel} from './src/components/site/product-purchase-panel';" : ""}
        function CartState(){const cart=useCart();return <output hidden data-testid="cart-state">{JSON.stringify(cart.items)}</output>};function Fixture(){const [quantity,setQuantity]=useState(2);return <CartProvider><CartState/>
          ${purchasePanel ? `<Toaster/><ProductQuantityProvider><ProductPurchasePanel product={${JSON.stringify(fixtureProduct)}}/><DeliveryEstimator product={${JSON.stringify(fixtureProduct)}}/></ProductQuantityProvider>` : `
          <label>Quantidade de teste<input type="number" value={quantity} onChange={event=>setQuantity(Number(event.target.value))}/></label>
          <DeliveryEstimator initialPostalCode={${JSON.stringify(initialPostalCode)}} ${cartOnly ? "" : `product={${JSON.stringify(fixtureProduct)}} quantity={quantity}`}/>`}
        </CartProvider>};createRoot(document.getElementById('root')).render(<Fixture/>);`,
      resolveDir: process.cwd(), loader: "tsx",
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "delivery-navigation-fixture", setup(builder) {
      builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
      builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: "image", namespace: "fixture" }));
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
        contents: args.path === "link" ? "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}" : args.path === "image" ? "import React from 'react';export default function Image({fill,priority,unoptimized,...props}){return <img {...props}/>}" : "export const useRouter=()=>({push(path){window.navigations.push(path)},refresh(){}});export const usePathname=()=>'/produto/produto-sintetico';",
        loader: "tsx", resolveDir: process.cwd(),
      }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script>window.navigations=[];</script><script src="/fixture.js"></script>' });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/api/miauby/carrinho") return route.fulfill({ json: { ok: true } });
      return route.abort();
    });
    try { await run(page); } catch (error) {
      if (errors.length) throw new Error(errors.join("; "), { cause: error });
      throw error;
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

async function consult(page: Page, postalCode: string) {
  await page.getByRole("textbox", { name: "CEP", exact: true }).fill(postalCode);
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
}

test("CEP inicial compartilhado fica preenchido sem consultar automaticamente", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/fretes/{cotacao,estimativa}", route => { requests++; return route.fulfill({ json: quotePayload(route, [quote]) }); });
    await page.goto(origin);
    await expect(page.getByRole("textbox", { name: "CEP", exact: true })).toHaveValue("80010-000");
    assert.equal(requests, 0);
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("PAC");
    assert.equal(requests, 1);
  }, false, product, false, "80010000");
});

test("CEP nacional consulta frete do produto e quantidade atuais, sem misturar o carrinho", async () => {
  await fixture(async page => {
    const requests: unknown[] = [];
    await page.addInitScript(other => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ ...other, id: "other-product", quantity: 7 }])), product);
    await page.route("**/api/fretes/{cotacao,estimativa}", route => {
      assert.equal(route.request().method(), "POST");
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: quotePayload(route, [quote]) });
    });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect.poll(() => requests.length).toBe(1);
    assert.deepEqual(requests[0], { postalCode: "80010000", productId: product.id, quantity: 2 });
    await expect(page.getByRole("status")).toContainText("PAC");
    await expect(page.getByRole("status")).toContainText(/18,75/);
    await expect(page.getByRole("status")).toContainText(/4 dias/);
    await expect(page.getByRole("link", { name: "Consultar envio no WhatsApp", exact: true })).toHaveCount(0);
  });
});

test("CEP inválido não consulta e entrega local reconfere disponibilidade no servidor", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/fretes/{cotacao,estimativa}", route => { requests++; return route.fulfill({ json: { data: { mode: "local", options: [] } } }); });
    await page.goto(origin);
    await consult(page, "12345");
    await expect(page.getByRole("status")).toContainText(/CEP/i);
    await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveCount(0);
    assert.equal(requests, 0);
    for (const [postalCode, city] of [["87525-000", "Ivaté"], ["87485-000", "Douradina"]]) {
      await consult(page, postalCode);
      await expect(page.getByRole("status")).toContainText(city);
      await expect(page.getByRole("status")).toContainText(/grátis|gratuita/i);
      await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveCount(0);
    }
    assert.equal(requests, 2);
  });
});

for (const [status, error] of [
  [422, "Produto ainda não liberado para envio por transportadora."],
  [409, "Estoque insuficiente para este produto."],
] as const) {
  test(`erro de cotação preserva o motivo (${status}), sem inventar preço ou falta de cobertura`, async () => {
    await fixture(async page => {
      await page.route("**/api/fretes/{cotacao,estimativa}", route => route.fulfill({ status, json: { error } }));
      await page.goto(origin);
      await consult(page, "80010-000");
      await expect(page.getByRole("status")).toContainText(error);
      await expect(page.getByRole("status")).not.toContainText(/fora de cobertura|ainda nao disponivel|18,75|4 dias/i);
      if (status === 409) {
        await expect(page.getByRole("button", { name: "Avise-me quando chegar", exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveCount(0);
      }
    });
  });
}

for (const change of ["CEP", "quantidade"] as const) {
  test(`alteração de ${change} invalida cotação anterior e ignora resposta atrasada`, async () => {
    await fixture(async page => {
      const requests: { postalCode: string; quantity: number }[] = [];
      let release: (() => void) | undefined;
      let finished: Promise<void> | undefined;
      await page.route("**/api/fretes/{cotacao,estimativa}", async route => {
        requests.push(route.request().postDataJSON());
        if (requests.length === 1) {
          const pending = new Promise<void>(resolve => { release = resolve; });
          finished = pending.then(async () => {
            await route.fulfill({ json: quotePayload(route, [{ ...quote, service: "Serviço antigo", priceCents: 9999 }]) }).catch(() => undefined);
          });
          await finished;
          return;
        }
        return route.fulfill({ json: quotePayload(route, [quote]) });
      });
      await page.goto(origin);
      await consult(page, "80010-000");
      await expect.poll(() => requests.length).toBe(1);
      if (change === "CEP") await page.getByRole("textbox", { name: "CEP", exact: true }).fill("01001-000");
      else {
        await page.getByLabel("Quantidade de teste").fill("3");
        await page.getByLabel("Quantidade de teste").fill("2");
        await expect(page.getByRole("button", { name: "Consultar", exact: true })).toBeEnabled();
        await page.getByLabel("Quantidade de teste").fill("3");
      }
      await expect(page.getByText("Serviço antigo", { exact: true })).toHaveCount(0);
      release?.();
      await finished;
      await page.getByRole("button", { name: "Consultar", exact: true }).click();
      await expect.poll(() => requests.length).toBe(2);
      assert.equal(requests[1].postalCode, change === "CEP" ? "01001000" : "80010000");
      assert.equal(requests[1].quantity, change === "quantidade" ? 3 : 2);
      await expect(page.getByRole("status")).toContainText("PAC");
      await expect(page.getByRole("status")).not.toContainText(/Serviço antigo|99,99/);
      if (change === "CEP") await page.getByRole("textbox", { name: "CEP", exact: true }).fill("01001");
      else await page.getByLabel("Quantidade de teste").fill("4");
      await expect(page.getByText(/18,75/)).toHaveCount(0);
    });
  });
}

test("simulador sem produto orienta adicionar itens quando o carrinho está vazio", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/fretes/{cotacao,estimativa}", route => { requests++; return route.fulfill({ json: quotePayload(route, [quote]) }); });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect(page.getByRole("status")).toContainText(/adicion.*produto|adicion.*ite/i);
    assert.equal(requests, 0);
  }, true);
});

test("simulador sem produto consulta os itens e preços do carrinho hidratado", async () => {
  await fixture(async page => {
    const requests: unknown[] = [];
    await page.addInitScript(item => localStorage.setItem("wimifarma-cart-v1", JSON.stringify([{ ...item, quantity: 3 }])), product);
    await page.route("**/api/fretes/{cotacao,estimativa}", route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: quotePayload(route, [quote]) });
    });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect.poll(() => requests.length).toBe(1);
    assert.deepEqual(requests[0], { postalCode: "80010000", items: [{ productId: product.id, quantity: 3, expectedUnitPriceCents: 2590 }] });
    await expect(page.getByRole("status")).toContainText(/18,75/);
  }, true);
});

test("seletor real do produto compartilha quantidade com a simulação de frete", async () => {
  await fixture(async page => {
    const requests: { quantity: number }[] = [];
    await page.route("**/api/fretes/{cotacao,estimativa}", route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: quotePayload(route, [quote]) });
    });
    await page.goto(origin);
    await page.getByRole("button", { name: "Aumentar quantidade", exact: true }).first().click();
    await consult(page, "80010-000");
    await expect.poll(() => requests.length).toBe(1);
    assert.equal(requests[0].quantity, 2);
    await expect(page.getByRole("status")).toContainText(/18,75/);
  }, false, product, true);
});

test("botões do detalhe não navegam sem o novo produto quando o carrinho já tem 30 itens distintos", async () => {
  await fixture(async page => {
    await page.addInitScript(item => localStorage.setItem("wimifarma-cart-v1", JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ ...item, id: `filled-${i}`, quantity: 1 })))), product);
    await page.goto(origin);
    for (const name of ["Adicionar ao carrinho", "Comprar agora"]) {
      await page.getByRole("button", { name, exact: true }).first().click();
      assert.deepEqual(await page.evaluate("window.navigations"), []);
      await expect(page.getByText("Seu carrinho ja tem 30 produtos diferentes.", { exact: true }).first()).toBeVisible();
    }
    const items = await page.evaluate(() => JSON.parse(document.querySelector('[data-testid="cart-state"]')!.textContent!) as { id: string }[]);
    assert.equal(items.length, 30);
    assert.equal(items.some(item => item.id === product.id), false);
  }, false, product, true);
});

for (const count of [29, 30]) test(`detalhe permite comprar com ${count} itens quando há espaço ou o produto já está no carrinho`, async () => {
  await fixture(async page => {
    await page.addInitScript(({ item, count }) => localStorage.setItem("wimifarma-cart-v1", JSON.stringify(Array.from({ length: count }, (_, i) => ({ ...item, id: count === 30 && i === 0 ? item.id : `filled-${i}`, quantity: 1 })))), { item: product, count });
    await page.goto(origin);
    await page.getByRole("button", { name: "Comprar agora", exact: true }).first().click();
    assert.deepEqual(await page.evaluate("window.navigations"), ["/checkout"]);
    await expect.poll(() => page.evaluate(id => (JSON.parse(document.querySelector('[data-testid="cart-state"]')!.textContent!) as { id: string; quantity: number }[]).find(item => item.id === id)?.quantity, product.id)).toBe(count === 30 ? 2 : 1);
  }, false, product, true);
});

for (const prescriptionType of ["CONTROLLED", "ANTIMICROBIAL", "UNREVIEWED"] as const) {
  test(`produto ${prescriptionType} preserva atendimento assistido sem cotar transportadora`, async () => {
    await fixture(async page => {
      let requests = 0;
      await page.route("**/api/fretes/{cotacao,estimativa}", route => { requests++; return route.fulfill({ json: quotePayload(route, [quote]) }); });
      await page.goto(origin);
      await consult(page, "80010-000");
      await expect(page.getByRole("status")).toContainText(/atendimento.*farmácia/i);
      await expect(page.getByRole("link", { name: "Consultar no WhatsApp", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Consultar envio no WhatsApp", exact: true })).toHaveCount(0);
      assert.equal(requests, 0);
    }, false, { ...product, requiresPrescription: true, prescriptionType });
  });
}

test("Farmácia Popular mantém atendimento assistido sem cotar transportadora", async () => {
  await fixture(async page => {
    let requests = 0;
    await page.route("**/api/fretes/estimativa", route => { requests++; return route.fulfill({ json: quotePayload(route, [quote]) }); });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect(page.getByRole("status")).toContainText("Entrega com atendimento da farmácia");
    await expect(page.getByRole("link", { name: "Consultar no WhatsApp", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Consultar envio no WhatsApp", exact: true })).toHaveCount(0);
    assert.equal(requests, 0);
  }, false, { ...product, isPopularPharmacy: true });
});

test("produto sem estoque preserva Avise-me e não consulta frete", async () => {
  await fixture(async page => {
    await page.goto(origin);
    await expect(page.getByRole("heading", { name: "Indisponível no momento", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Avise-me quando chegar", exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "CEP", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveCount(0);
  }, false, { ...product, stock: 0 });
});

test("produto removido do catálogo preserva consulta genérica sem Avise-me", async () => {
  await fixture(async page => {
    await page.route("**/api/fretes/estimativa", route => route.fulfill({ status: 404, json: { error: "Produto sintético removido." } }));
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect(page.getByRole("heading", { name: "Indisponível no momento", exact: true })).toBeVisible();
    const contact = page.getByRole("link", { name: "Consultar no WhatsApp", exact: true });
    await expect(contact).toBeVisible();
    assert.equal(new URL((await contact.getAttribute("href"))!).searchParams.get("text"), `Ola, gostaria de consultar ${product.name}.`);
    await expect(page.getByRole("button", { name: "Avise-me quando chegar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Consultar envio no WhatsApp", exact: true })).toHaveCount(0);
  });
});

for (const width of [320, 390, 1440]) {
  test(`benefício exibido vem do servidor e mantém leitura em ${width}px`, async () => {
    await fixture(async page => {
      await page.setViewportSize({ width, height: 900 });
      let requests = 0;
      await page.route("**/api/fretes/{cotacao,estimativa}", route => {
        requests++;
        return route.fulfill({ json: quotePayload(route, [{ ...quote, benefit: { status: "discounted", customerPriceCents: 375, subsidyCents: 1500, minimumOrderCents: 15000, remainingCents: 5010 } }]) });
      });
      await page.goto(origin);
      await consult(page, "80010-000");
      const deliveryResult = page.getByRole("status").filter({ has: page.getByText("Opções de entrega", { exact: true }) });
      await expect(deliveryResult).toContainText(/3,75/);
      await expect(deliveryResult).toContainText(/15,00/);
      await expect(deliveryResult.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "66");
      await expect(deliveryResult).toContainText(/prazos estimados/i);
      await expect(deliveryResult).not.toContainText("Grátis");
      assert.equal(requests, 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    }, false, { ...product, unitPriceCents: 4995 });
  });
}


test("rascunho oferece consulta de envio com produto, quantidade e CEP sem prometer transporte", async () => {
  await fixture(async page => {
    const requests: unknown[] = [];
    let release: (() => void) | undefined;
    await page.route("**/api/fretes/estimativa", async route => {
      requests.push(route.request().postDataJSON());
      await new Promise<void>(resolve => { release = resolve; });
      const { token: _token, ...option } = quote; void _token;
      return route.fulfill({ json: { data: { mode: "estimate", options: [option, { ...option, serviceId: 2, service: "SEDEX" }] } } });
    });
    await page.goto(origin);
    await consult(page, "80010-000");
    await expect.poll(() => requests.length).toBe(1);
    try {
      await expect(page.getByRole("button", { name: "Consultando...", exact: true })).toBeDisabled();
      await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveCount(0);
    } finally { release?.(); }
    await expect(page.getByRole("status")).toContainText("Estimativa de frete");
    const contact = page.getByRole("link", { name: "Consultar envio no WhatsApp", exact: true });
    await expect(contact).toBeVisible();
    const url = new URL((await contact.getAttribute("href"))!);
    assert.equal(url.origin, "https://wa.me");
    assert.match(url.searchParams.get("text")!, /Produto sintético/);
    assert.match(url.searchParams.get("text")!, /2 unidades/);
    assert.match(url.searchParams.get("text")!, /80010-000/);
    assert.deepEqual(requests, [{ productId: product.id, quantity: 2, postalCode: "80010000" }]);
    await expect(page.getByRole("status")).toContainText("Envio sob consulta para este CEP.");
    await expect(page.getByRole("status")).toContainText("A equipe confirma a possibilidade e as condições do envio.");
    await expect(page.getByRole("status")).toContainText("Valores e prazos estimados.");
    await expect(page.getByRole("status").getByRole("listitem")).toHaveCount(2);
    await expect(page.getByRole("status")).toContainText("PAC");
    await expect(page.getByRole("status")).toContainText("SEDEX");
    await expect(page.getByRole("status")).toContainText("4 dias úteis estimados");
    await expect(page.getByRole("status")).toContainText(/18,75/);
    await expect(page.getByRole("status")).not.toContainText(/Opções de entrega|Grátis|Envio ainda em preparação/);
    await page.getByLabel("Quantidade de teste").fill("3");
    await expect(contact).toHaveCount(0);
    assert.deepEqual(await page.evaluate("window.navigations"), []);
  });
});

test("fallback sem tarifas preserva o atendimento genérico", async () => {
  await fixture(async page => {
    await page.route("**/api/fretes/estimativa", route => route.fulfill({ json: { data: { mode: "available", options: [] } } }));
    await page.goto(origin);
    await consult(page, "80010-000");
    const contact = page.getByRole("link", { name: "Consultar no WhatsApp", exact: true });
    await expect(contact).toBeVisible();
    assert.equal(new URL((await contact.getAttribute("href"))!).searchParams.get("text"), "Ola, gostaria de consultar entrega para o meu CEP.");
    await expect(page.getByRole("link", { name: "Consultar envio no WhatsApp", exact: true })).toHaveCount(0);
  });
});
