import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";

test("atendimento mobile libera a compra, acompanha conteúdo tardio e mantém chat e desktop acessíveis", async () => {
  const bundle = await build({ stdin: { contents: `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {FloatingWhatsApp} from './src/components/site/floating-whatsapp';function Fixture(){const[ready,setReady]=useState(false);return <><main><button onClick={()=>setReady(true)}>Montar compra fictícia</button><div style={{height:200}}/>{ready&&<section data-product-purchase-panel style={{height:240}}>Compra fictícia</section>}<div style={{height:1600}}/></main><FloatingWhatsApp/></>}createRoot(document.getElementById('root')).render(<Fixture/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "floating-fixture", setup(builder) {
    builder.onResolve({ filter: /^next\/(navigation|image|link)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ resolveDir: process.cwd(), loader: "tsx", contents: args.path === "next/navigation" ? "export const usePathname=()=>'/produto/sintetico';" : args.path === "next/link" ? "import React from 'react';export default function Link(props){return <a {...props}/>;}" : "import React from 'react';export default function Image({priority,unoptimized,...props}){return <img {...props}/>;}" }));
  } }] });
  const css = (await postcss([tailwind()]).process(await fs.readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 700 }, reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const request = route.request(); const url = new URL(request.url());
      if (url.hostname !== "127.0.0.1" || request.method() !== "GET") { errors.push("Unexpected external request or write"); return route.abort(); }
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/fixture.css") return route.fulfill({ contentType: "text/css", body: css });
      if (url.pathname === "/brand/miauby-avatar.webp") return route.fulfill({ contentType: "image/webp", body: await fs.readFile("public/brand/miauby-avatar.webp") });
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>' });
    });
    await page.goto("http://127.0.0.1:3213/produto/sintetico");
    const trigger = page.getByRole("button", { name: "Conversar com a Miauby", exact: true });
    await expect(trigger).toBeVisible();
    await page.getByRole("button", { name: "Montar compra fictícia", exact: true }).click();
    await expect(trigger).toBeHidden();
    await page.setViewportSize({ width: 768, height: 700 });
    await expect(trigger).toBeVisible();
    await page.setViewportSize({ width: 390, height: 700 });
    await expect(trigger).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(trigger).toBeVisible();
    const whatsapp = page.getByRole("link", { name: "Chamar Wimifarma no WhatsApp", exact: true });
    assert.equal((await whatsapp.boundingBox())!.height, 44);
    assert.equal((await whatsapp.boundingBox())!.y, (await trigger.boundingBox())!.y);
    await trigger.click();
    const chat = page.getByRole("dialog", { name: "Conversa com a Miauby", exact: true });
    await expect(chat).toBeVisible();
    const box = (await chat.boundingBox())!;
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 700);
    assert.ok((await trigger.boundingBox())!.y >= box.y + box.height, "O atalho deve ficar abaixo da conversa aberta");
    await expect(chat.getByRole("button", { name: "Fechar conversa", exact: true })).toBeVisible();
    await chat.getByRole("textbox", { name: "Pergunte para a Miauby", exact: true }).fill("Dúvida fictícia de teste");
    const send = chat.getByRole("button", { name: "Enviar pergunta", exact: true });
    await expect(send).toBeEnabled();
    assert.ok(await send.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      return hit === element || element.contains(hit);
    }), "Os atalhos não podem cobrir o botão Enviar");
    await page.keyboard.press("Escape");
    await expect(chat).toHaveCount(0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
