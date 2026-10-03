import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";

// Entirely intercepted loopback fixture: no Next server, live data or gateway.
const base = "http://127.0.0.1:3198";
const output = "outputs/checkout-shipping-review";
const productPhoto = await fs.readFile("public/banners/products/dove-oleo.webp");
const modules = {
  "next/link": 'import React from "react"; export default function Link({children,...p}) { return React.createElement("a",p,children); }',
  "next/image": 'import React from "react"; export default function Image({unoptimized,priority,fill,...p}) { return React.createElement("img",p); }',
  "next/script": 'import {useEffect} from "react"; export default function Script({onReady}) { useEffect(()=>{ onReady?.(); },[]); return null; }',
};
const bundle = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {CartProvider} from './src/components/site/cart-provider'; import {CheckoutPage} from './src/components/site/checkout-page'; createRoot(document.getElementById('root')).render(<CartProvider><CheckoutPage initialCustomer={{name:'',phone:'',email:'',street:'',neighborhood:''}} carrierShippingAvailable={!new URLSearchParams(location.search).has('shipping-disabled')} isCustomer={new URLSearchParams(location.search).has('customer')} paymentConfig={{publicKey:'TEST-fixture-only',environment:'test',brands:[{id:'visa',name:'Visa',image:null}]}} /></CartProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }, plugins: [{ name: "fixture-next", setup(b) { b.onResolve({filter:/^next\/(link|image|script)$/}, a => ({path:a.path,namespace:"fixture"})); b.onLoad({filter:/.*/,namespace:"fixture"}, a => ({contents:modules[a.path],loader:"js",resolveDir:process.cwd()})); } }] });
const css = (await postcss([tailwind()]).process(await fs.readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], failures = [];
const product = price => ({id:"fixture-item",slug:"fixture-item",name:"Dove óleo de banho · produto de teste",imageUrl:"/qa-product.webp",category:"Teste",unitPriceCents:price,originalPriceCents:null,stock:20,requiresPrescription:false,isPopularPharmacy:false,quantity:1});

async function fixture(width, {price=9990,customer=false,failOrder=false,failPayment=false,failPaymentStatus="UNKNOWN",shippingAvailable=true,medicine=false,ordinaryMedicine=false,balance="0.01"}={}) {
  const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:"reduce"});
  const page = await context.newPage(); const errors=[], orders=[], payments=[], quotes=[];
  const state = {failOrder,failPayment,status:"NEW",expiresAt:null};
  page.on("pageerror",e=>errors.push(e.message));
  await context.addInitScript(({items}) => {
    if (!localStorage.getItem("wimifarma-cart-v1")) localStorage.setItem("wimifarma-cart-v1",JSON.stringify(items));
    window.__bricks=[];
    window.MercadoPago = class { bricks() { return {create:async(type,id,settings)=>{
      window.__bricks.push({type,initialization:settings.initialization,customization:settings.customization});
      const container=document.getElementById(id);
      const secure=document.createElement("iframe"); secure.title="Campos seguros de cartão (simulados)";secure.src="/secure-fields";secure.style="width:100%;height:135px;border:1px solid #ddd"; container.appendChild(secure);
      const button=document.createElement("button"); button.textContent="Pagar com cartão simulado";button.onclick=()=>settings.callbacks.onSubmit({token:"synthetic-token",payment_method_id:"visa",installments:12,payer:{email:"cliente@example.invalid"}},{paymentTypeId:"credit_card"}).catch(()=>{});container.appendChild(button);
      settings.callbacks.onReady(); return {unmount:async()=>container.replaceChildren()};
    }}; } };
  }, {items:medicine||ordinaryMedicine?[product(price-999),{...product(999),id:"fixture-medicine",name:"Medicamento · produto sintético",imageUrl:null,category:"Medicamentos",requiresPrescription:medicine}]:[product(price)]});
  await context.route("**/*", async route => {
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==base) return route.abort();
    const json=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(data)});
    if(url.pathname==="/checkout") return route.fulfill({contentType:"text/html; charset=utf-8",body:'<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"></head><body><main id="root"></main><script src="/qa.js"></script></body></html>'});
    if(url.pathname==="/qa.js") return route.fulfill({contentType:"text/javascript",body:Buffer.from(bundle.outputFiles[0].contents)});
    if(url.pathname==="/qa.css") return route.fulfill({contentType:"text/css",body:css});
    if(url.pathname==="/qa-product.webp") return route.fulfill({contentType:"image/webp",body:productPhoto});
    if(url.pathname==="/secure-fields") return route.fulfill({contentType:"text/html; charset=utf-8",body:'<label>Número de cartão simulado<input></label><label>CVV simulado<input></label>'});
    if(url.pathname.startsWith("/api/cep/")) { const cep=url.pathname.split("/").pop(); return json({data:{postalCode:cep,street:"Rua Sintética",neighborhood:"Bairro Teste",city:cep==="87485000"?"Douradina":cep==="87525000"?"Ivaté":cep==="87501070"?"Umuarama":"São Paulo",state:cep==="01001000"?"SP":"PR"}}); }
    if(url.pathname==="/api/minha-conta/cashback") return json({data:{balance}});
    if(url.pathname==="/api/fretes/cotacao") {quotes.push(request.postDataJSON());return json({data:[{provider:"melhor-envio",serviceId:1,carrier:"Transportadora Teste",service:"Normal",priceCents:2000,deliveryDays:5,token:"synthetic-quote"}]});}
    if(url.pathname==="/api/pedidos") {orders.push(request.postDataJSON());if(state.failOrder){state.failOrder=false;return route.abort("failed");}return json({data:{id:"fixture-order",number:"WF-SINTETICO-1",totalCents:price,paymentMethod:orders.at(-1).paymentMethod}});}
    if(url.pathname==="/api/pagamentos/fixture-order") {
      if(request.method()==="POST") {payments.push(request.postDataJSON());if(state.failPayment){state.failPayment=false;state.status=failPaymentStatus;return route.abort("failed");}if(request.postDataJSON().method==="pix"){state.status="PENDING";state.expiresAt=new Date(Date.now()+2*60*60*1000).toISOString();}if(request.postDataJSON().method==="card")state.status="PAID";}
      return json({data:{orderId:"fixture-order",number:"WF-SINTETICO-1",amountCents:price,status:state.status,statusDetail:null,pixCode:state.status==="PENDING"?"SYNTHETIC-PIX-CODE":null,pixExpiresAt:state.expiresAt,payerEmail:"cliente@example.invalid",qrDataUrl:state.status==="PENDING"?'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="white"/><text x="20" y="120">QR SINTÉTICO</text></svg>'):null,environment:"test",publicKey:"TEST-fixture-only"}});
    }
    if(url.pathname==="/api/miauby/carrinho")return json({});
    throw new Error(`Unexpected intercepted request: ${request.method()} ${url.pathname}`);
  });
  const query=new URLSearchParams();if(customer)query.set("customer","");if(!shippingAvailable)query.set("shipping-disabled","");
  await page.goto(`${base}/checkout?${query}`);
  await expect(page.getByRole("heading",{name:"Finalize sua compra"})).toBeVisible();
  return {page,context,state,errors,orders,payments,quotes};
}
async function fillContact(page,email="cliente@example.invalid") {await page.getByLabel("Nome completo").fill("Cliente Sintético");await page.getByLabel("WhatsApp / telefone").fill("+55 (44) 99999-0000");await page.getByLabel("E-mail",{exact:true}).fill(email);}
async function pickup(page) {await page.getByText("Retirar na farmacia",{exact:true}).click();}
async function privacy(page) {await page.getByRole("checkbox",{name:/Revisei meus dados/}).check();}
async function fits(page,width) {assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);}
async function test(name,run) {try {await run();results.push({name,passed:true});console.log(`PASS ${name}`);}catch(e){failures.push({name,error:e.message});console.log(`FAIL ${name}: ${e.message}`);}}
try {
  await test("ordinary medication can request carrier quote and create Pix with approved mocked packaging",async()=>{
    const f=await fixture(390,{ordinaryMedicine:true});const {page}=f;
    try {await fillContact(page);await page.getByLabel("CEP",{exact:true}).fill("01001000");await expect(page.getByLabel("Cidade",{exact:true})).toHaveValue("São Paulo");await page.getByLabel("Numero",{exact:true}).fill("123");await expect(page.getByRole("heading",{name:"Este carrinho precisa de atendimento"})).toHaveCount(0);await page.getByRole("button",{name:"Calcular frete"}).click();await page.getByRole("radio",{name:/Transportadora Teste/}).check();await privacy(page);await page.getByRole("button",{name:"Gerar Pix e finalizar"}).click();await expect(page.getByLabel("Código Pix copia e cola")).toHaveValue("SYNTHETIC-PIX-CODE");assert.equal(f.quotes.length,1);assert.equal(f.orders.length,1);assert.equal(f.payments.length,1);await fits(page,390);assert.deepEqual(f.errors,[]);}finally{await f.context.close();}
  });
  for (const width of [320,390,768,1440]) for (const medicine of [false,true]) await test(`blocked carrier and compact address ${width} ${medicine?"medicine":"disabled"}`,async()=>{
    const f=await fixture(width,{price:4689,customer:true,balance:"0",shippingAvailable:medicine,medicine});const {page}=f;
    try {
      await fillContact(page);await page.getByLabel("CEP",{exact:true}).fill("87501070");await expect(page.getByLabel("Cidade",{exact:true})).toHaveValue("Umuarama");await page.getByLabel("Numero",{exact:true}).fill("123");
      await expect(page.getByRole("heading",{name:medicine?"Este carrinho precisa de atendimento":"Entrega por transportadora indisponível"})).toBeVisible();await expect(page.getByRole("button",{name:"Calcular frete"})).toHaveCount(0);
      const summary=page.getByRole("region",{name:"Resumo da compra"});await expect(summary.getByText(medicine?"Atendimento":"Indisponível",{exact:true})).toBeVisible();await expect(summary.getByText("Subtotal",{exact:true})).toBeVisible();await expect(summary.getByText("Grátis",{exact:true})).toHaveCount(0);
      await expect(page.getByText("Sem saldo disponível para este pedido.",{exact:true})).toBeVisible();await fits(page,width);
      const rects=await page.locator('.delivery-address-grid input').evaluateAll(els=>els.map(e=>({name:e.name,x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width})));
      const find=name=>rects.find(r=>r.name===name);assert.equal(rects.length,7);assert.equal(find("postalCode").y,find("number").y);assert.equal(find("neighborhood").y,find("complement").y);assert.equal(find("city").y,find("state").y);assert.ok(find("street").width>find("number").width);assert.equal(new Set(rects.map(r=>r.y)).size,4);
      if(width===1440){const panels=await page.locator('[data-checkout-panel]').evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,y:e.getBoundingClientRect().y})));assert.equal(panels.length,3);for(const key of ["width","height","y"])assert.ok(Math.max(...panels.map(p=>p[key]))-Math.min(...panels.map(p=>p[key]))<2,`${key} differs between desktop panels`);}
      // Tab order follows the visible rows, including the optional complement.
      await page.getByLabel("CEP",{exact:true}).focus();for(const name of ["number","street","neighborhood","complement","city","state"]){await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.name),name);}
      await privacy(page);await page.getByRole("button",{name:"Gerar Pix e finalizar"}).click();await expect(page.getByRole("alert")).toContainText("retirada");assert.equal(f.orders.length,0);assert.equal(f.payments.length,0);assert.equal(f.quotes.length,0);
      await page.screenshot({path:`${output}/delivery-${medicine?"medicine":"disabled"}-${width}.png`,fullPage:true});await page.getByRole("button",{name:"Retirar na loja"}).click();await expect(summary.getByText("Grátis",{exact:true})).toBeVisible();await expect(summary.getByText("Total do pedido",{exact:true})).toBeVisible();assert.deepEqual(f.errors,[]);
    }finally{await f.context.close();}
  });
  await test("restored carrier selection is discarded when quoting becomes unavailable",async()=>{
    const f=await fixture(390);const {page}=f;
    try {await fillContact(page);await page.getByLabel("CEP",{exact:true}).fill("01001000");await expect(page.getByLabel("Cidade",{exact:true})).toHaveValue("São Paulo");await page.getByLabel("Numero",{exact:true}).fill("123");await page.getByRole("button",{name:"Calcular frete"}).click();await page.getByRole("radio",{name:/Transportadora Teste/}).check();await expect.poll(()=>page.evaluate(()=>Boolean(JSON.parse(sessionStorage.getItem("wimifarma-checkout-draft-v1"))?.data.shippingSelection))).toBe(true);
      await page.goto(`${base}/checkout?shipping-disabled`);await expect(page.getByRole("heading",{name:"Entrega por transportadora indisponível"})).toBeVisible();await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem("wimifarma-checkout-draft-v1"))?.data.shippingSelection)).toBeUndefined();await expect(page.getByRole("region",{name:"Resumo da compra"}).getByText("Indisponível",{exact:true})).toBeVisible();await privacy(page);await page.getByRole("button",{name:"Gerar Pix e finalizar"}).click();assert.equal(f.orders.length,0);assert.equal(f.payments.length,0);assert.equal(f.quotes.length,1);assert.deepEqual(f.errors,[]);
    }finally{await f.context.close();}
  });
  for(const width of [320,390,768,1440]) await test(`layout and Pix reload ${width}`,async()=>{
    const f=await fixture(width);const {page}=f;
    try {
      await fits(page,width);await expect(page.getByAltText("Dove óleo de banho · produto de teste")).toBeVisible();assert.ok(await page.getByAltText("Dove óleo de banho · produto de teste").evaluate(img=>img.complete&&img.naturalWidth>0));const boxes=await page.locator('h2').filter({hasText:/^(Seus dados|Entrega ou retirada|Pagamento)$/}).evaluateAll(els=>els.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
      if(width===1440){assert.equal(boxes.length,3);assert.ok(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))<2);assert.ok(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x);}
      await page.screenshot({path:`${output}/checkout-${width}.png`,fullPage:true});
      await fillContact(page);await pickup(page);await privacy(page);await page.getByRole("button",{name:"Gerar Pix e finalizar"}).click();
      await expect(page.getByAltText("QR Code para pagar este pedido com Pix")).toBeVisible();await expect(page.getByLabel("Código Pix copia e cola")).toHaveValue("SYNTHETIC-PIX-CODE");
      await expect(page.getByText(/0[12]:[0-5]\d:[0-5]\d/)).toBeVisible();const expiry=f.state.expiresAt;
      await page.screenshot({path:`${output}/pix-${width}.png`,fullPage:true});await page.reload();
      await expect(page.getByLabel("Código Pix copia e cola")).toHaveValue("SYNTHETIC-PIX-CODE");assert.equal(f.orders.length,1);assert.equal(f.payments.length,1);assert.equal(f.state.expiresAt,expiry);await fits(page,width);
      await page.clock.install();await page.clock.fastForward(2*60*60*1000+2000);await expect(page.getByText("Prazo do Pix encerrado",{exact:true})).toBeVisible();await expect(page.getByAltText("QR Code para pagar este pedido com Pix")).toHaveCount(0);assert.deepEqual(f.errors,[]);
    }finally{await f.context.close();}
  });
  await test("card contact/privacy/address gate and 12 installments",async()=>{
    const f=await fixture(390);const {page}=f;
    try {await page.getByLabel("Cartão",{exact:true}).locator("..").click();await expect(page.locator("iframe")).toHaveCount(0);await fillContact(page,"invalid");await pickup(page);await privacy(page);await expect(page.locator("iframe")).toHaveCount(0);await page.getByLabel("E-mail",{exact:true}).fill("cliente@example.invalid");await page.getByRole("checkbox",{name:/Revisei meus dados/}).uncheck();await expect(page.locator("iframe")).toHaveCount(0);await privacy(page);await expect(page.locator("iframe")).toBeVisible();
      assert.deepEqual(await page.evaluate(()=>window.__bricks.at(-1).customization.paymentMethods),{minInstallments:1,maxInstallments:12});await page.screenshot({path:`${output}/card-390.png`,fullPage:true});await page.getByRole("button",{name:"Pagar com cartão simulado"}).click();await expect(page.getByRole("heading",{name:"Pagamento confirmado"})).toBeVisible();assert.equal(f.payments[0].installments,12);assert.ok(!JSON.stringify(f.orders).includes("synthetic-token"));assert.deepEqual(f.errors,[]);
    }finally{await f.context.close();}
  });
  await test("card requires complete delivery address",async()=>{
    const f=await fixture(390);const {page}=f;
    try {await fillContact(page);await page.getByLabel("CEP",{exact:true}).fill("87525000");await expect(page.getByLabel("Cidade",{exact:true})).toHaveValue("Ivaté");await page.getByLabel("Cartão",{exact:true}).locator("..").click();await privacy(page);await expect(page.locator("iframe")).toHaveCount(0);await page.getByLabel("Numero",{exact:true}).fill("123");await expect(page.locator("iframe")).toBeVisible();}finally{await f.context.close();}
  });
  await test("cash limited to local CEP or pickup",async()=>{
    const f=await fixture(390);const {page}=f;
    try {for(const cep of ["87525000","87485000"]){await page.getByLabel("CEP",{exact:true}).fill(cep);await expect(page.getByLabel("Dinheiro na entrega local")).toBeVisible();}await page.getByLabel("CEP",{exact:true}).fill("01001000");await expect(page.getByLabel("Cidade",{exact:true})).toHaveValue("São Paulo");await expect(page.getByLabel("Dinheiro na entrega local")).toHaveCount(0);await pickup(page);await expect(page.getByLabel("Dinheiro na retirada")).toBeVisible();}finally{await f.context.close();}
  });
  await test("carrier threshold after discount and quote selection",async()=>{
    const f=await fixture(390,{customer:true});const {page}=f;
    try {await page.getByLabel("CEP",{exact:true}).fill("01001000");await page.getByRole("button",{name:"Calcular frete"}).click();const option=page.getByRole("radio",{name:/Transportadora Teste/});await option.check();await expect(page.getByText(/frete grátis aplicado/)).toBeVisible();await page.getByLabel("Usar saldo de cashback").check();await expect(page.getByText(/Normal: R\$.*20,00/)).toBeVisible();await expect(page.getByText(/Faltam R\$.*0,01 para frete grátis/)).toBeVisible();await fits(page,390);}finally{await f.context.close();}
  });
  await test("uncertain order retry preserves request id",async()=>{
    const f=await fixture(390,{failOrder:true});const {page}=f;
    try {await fillContact(page);await pickup(page);await page.getByRole("button",{name:"Gerar Pix e finalizar"}).click();await expect(page.getByRole("alert")).toContainText("privacidade");assert.equal(f.orders.length,0);await privacy(page);await page.getByRole("button",{name:"Gerar Pix e finalizar"}).click();await expect(page.getByRole("alert")).toBeVisible();await page.reload();await expect(page.getByLabel("Nome completo")).toHaveValue("Cliente Sintético");await expect(page.getByRole("checkbox",{name:/Revisei meus dados/})).not.toBeChecked();await privacy(page);await page.getByRole("button",{name:"Gerar Pix e finalizar"}).click();await expect(page.getByAltText("QR Code para pagar este pedido com Pix")).toBeVisible();assert.equal(f.orders.length,2);assert.equal(f.orders[0].checkoutRequestId,f.orders[1].checkoutRequestId);}finally{await f.context.close();}
  });
  await test("uncertain payment resumes without second charge",async()=>{
    const f=await fixture(390,{failPayment:true});const {page}=f;
    try {await fillContact(page);await pickup(page);await privacy(page);await page.getByRole("button",{name:"Gerar Pix e finalizar"}).click();await expect(page.getByText("Aguardando confirmação do Mercado Pago",{exact:true})).toBeVisible();await page.reload();await expect(page.getByText("Aguardando confirmação do Mercado Pago",{exact:true})).toBeVisible();assert.equal(f.orders.length,1);assert.equal(f.payments.length,1);await page.getByRole("button",{name:"Consultar pagamento"}).click();assert.deepEqual(f.payments.at(-1),{action:"refresh"});}finally{await f.context.close();}
  });
  for (const status of ["REFUNDED", "PARTIALLY_REFUNDED", "DISPUTED"]) await test(`terminal ${status} releases resume pointer without clearing cart`, async () => {
    const f = await fixture(390);
    const { page } = f;
    try {
      f.state.status = status;
      const cartBefore = await page.evaluate(() => localStorage.getItem("wimifarma-cart-v1"));
      await page.evaluate(() => {
        sessionStorage.setItem("wimifarma-active-payment:guest", "fixture-order");
        sessionStorage.setItem("wimifarma-payment-attempt:fixture-order", "wimifarma-checkout-attempt:guest");
        sessionStorage.setItem("wimifarma-checkout-attempt:guest", JSON.stringify({ id: "synthetic-attempt", signature: "synthetic-signature" }));
        sessionStorage.setItem("wimifarma-payment-cart:fixture-order", JSON.stringify([["fixture-item", 1, 9990]]));
      });
      await page.reload();
      await expect(page.getByRole("heading", { name: "Situação do pagamento" })).toBeVisible();
      const message = status === "REFUNDED" ? "Pagamento reembolsado." : status === "PARTIALLY_REFUNDED" ? "Parte do pagamento foi reembolsada. Fale com a equipe para conferir os valores." : "Pagamento em contestação. Fale com a equipe.";
      await expect(page.getByText(message, { exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => sessionStorage.getItem("wimifarma-active-payment:guest"))).toBeNull();
      assert.equal(await page.evaluate(() => sessionStorage.getItem("wimifarma-payment-attempt:fixture-order")), null);
      assert.equal(await page.evaluate(() => sessionStorage.getItem("wimifarma-checkout-attempt:guest")), null);
      assert.equal(await page.evaluate(() => localStorage.getItem("wimifarma-cart-v1")), cartBefore);
      await page.screenshot({ path: `${output}/terminal-${status.toLowerCase()}-390.png`, fullPage: true });
      await page.reload();
      await expect(page.getByRole("button", { name: "Gerar Pix e finalizar" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Situação do pagamento" })).toHaveCount(0);
      assert.equal(await page.evaluate(() => localStorage.getItem("wimifarma-cart-v1")), cartBefore);
      assert.equal(f.state.status, status);
      assert.equal(f.orders.length, 0);
      assert.equal(f.payments.length, 0);
      assert.deepEqual(f.errors, []);
    } finally { await f.context.close(); }
  });
  await test("network failure with canonical NEW keeps submission error visible", async () => {
    const f = await fixture(390, { failPayment: true, failPaymentStatus: "NEW" });
    const { page } = f;
    try {
      await fillContact(page); await pickup(page); await privacy(page);
      await page.getByRole("button", { name: "Gerar Pix e finalizar" }).click();
      await expect(page.getByRole("button", { name: "Gerar QR Code Pix" })).toBeVisible();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).not.toBeEmpty();
      assert.equal(f.state.status, "NEW");
      assert.equal(f.orders.length, 1); assert.equal(f.payments.length, 1);
      await page.screenshot({ path: `${output}/network-new-error-390.png`, fullPage: true });
      assert.deepEqual(f.errors, []);
    } finally { await f.context.close(); }
  });
} finally {await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({fixture:"isolated synthetic; SDK simulated, gateway not homologated by this audit",results,failures},null,2));}
console.log(JSON.stringify({passed:results.length,failed:failures.length,output}));
if(failures.length)process.exitCode=1;
