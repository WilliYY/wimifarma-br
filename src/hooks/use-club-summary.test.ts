import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

test("Club compartilha consultas simultâneas e preserva atualização, retry e isolamento de identidade", async () => {
  const script = await build({ stdin: { contents: `
    import React, {useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import {useClubSummary} from './src/hooks/use-club-summary';
    import {ClubSummaryProvider} from './src/hooks/club-summary-provider';
    const ownerKeys = ${JSON.stringify(Object.fromEntries(["alice", "bob"].map(id => [id, createHash("sha256").update(`miauby:${id}`).digest("hex").slice(0, 24)])))};
    function Consumer({index,enabled}) {
      const club = useClubSummary(enabled);
      return <div data-consumer={index}><output>{JSON.stringify({summary:club.summary,loading:club.loading,guest:club.guest,error:club.error})}</output><button onClick={()=>club.refresh()}>Retry</button><button onClick={()=>club.join()}>Join</button></div>;
    }
    function App(){const [identity,setIdentity]=useState('alice');const [count,setCount]=useState(4);const [enabled,setEnabled]=useState(true);
      window.changeIdentity=setIdentity;window.changeCount=setCount;window.setEnabled=setEnabled;
      return <ClubSummaryProvider key={identity} ownerKey={ownerKeys[identity]??null}>{Array.from({length:count},(_,index)=><Consumer key={index} index={index} enabled={enabled}/>)}</ClubSummaryProvider>;
    }
    createRoot(document.getElementById('root')).render(<App/>);
  `, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{name:"session-router",setup(builder){
    builder.onResolve({filter:/^next\/navigation$/},()=>({path:"router",namespace:"fixture"}));
    builder.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:"const router={refresh:()=>{window.routerRefreshes=(window.routerRefreshes??0)+1}};export const useRouter=()=>router;",loader:"js"}));
  }}] });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    let calls = 0;
    let balance = 100;
    let status = 200;
    let sessionIdentity: string | null = "alice";
    let sessionStatus = 200;
    const methods: string[] = [];
    const pending: Array<() => Promise<void>> = [];
    await page.route("**/*", route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/") return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script type="module" src="/fixture.js"></script>' });
      if (pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script.outputFiles[0].text });
      if (pathname === "/api/auth/session") return route.fulfill({ status: sessionStatus, json: sessionIdentity ? { user: { id: sessionIdentity }, expires: "2099-01-01T00:00:00Z" } : null });
      if (pathname === "/api/minha-conta/club") {
        calls++;
        methods.push(route.request().method());
        const currentBalance = balance;
        const currentStatus = status;
        pending.push(async () => { await route.fulfill({ status: currentStatus, json: { data: { member: true, joinedAt: null, balancePoints: currentBalance, pendingPoints: 0, lifetimeEarnedPoints: currentBalance, lifetimeRedeemedPoints: 0, transactions: [] } } }).catch(() => {}); });
        return;
      }
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3187/");
    await expect(page.locator("output")).toHaveCount(4);
    await expect.poll(() => calls).toBeGreaterThan(0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(calls, 1, "quatro consumidores devem compartilhar um GET pendente");
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":100');
    await expect(page.locator("output").last()).toContainText('"balancePoints":100');
    balance = 200;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => calls).toBe(2);
    balance = 300;
    await page.evaluate(() => window.dispatchEvent(new Event("wimifarma:club-updated")));
    await expect.poll(() => calls).toBe(3);
    await pending.shift()!();
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":300');
    await expect(page.locator("output").last()).toContainText('"balancePoints":300');

    // A later consumer revalidates even when the provider already has a balance.
    balance = 400;
    await page.evaluate(() => (window as unknown as {changeCount:(count:number)=>void}).changeCount(5));
    await expect.poll(() => calls).toBe(4);
    await pending.shift()!();
    await expect(page.locator("output").last()).toContainText('"balancePoints":400');

    status = 500;
    await page.getByRole("button", { name: "Retry", exact: true }).first().click();
    await expect.poll(() => calls).toBe(5);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText("Não foi possível consultar o Club.");
    await expect(page.locator("output").last()).toContainText('"summary":null');
    status = 200;
    await page.getByRole("button", { name: "Retry", exact: true }).first().click();
    await expect.poll(() => calls).toBe(6);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"error":null');

    // A response started by Alice must never populate Bob's provider.
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => calls).toBe(7);
    balance = 900;
    sessionIdentity = "bob";
    await page.evaluate(() => (window as unknown as {changeIdentity:(identity:string)=>void}).changeIdentity("bob"));
    await expect.poll(() => calls).toBe(8);
    await expect(page.locator("output").first()).toContainText('"summary":null');
    await pending.shift()!();
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":900');
    await expect(page.locator("output").last()).toContainText('"balancePoints":900');

    status = 401;
    sessionIdentity = null;
    await page.evaluate(() => (window as unknown as {changeIdentity:(identity:string)=>void}).changeIdentity("anonymous"));
    await expect.poll(() => calls).toBe(9);
    await expect(page.locator("output").first()).toContainText('"summary":null');
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"guest":true');
    status = 200;
    balance = 50;
    sessionIdentity = "alice";
    await page.evaluate(() => (window as unknown as {changeIdentity:(identity:string)=>void}).changeIdentity("alice"));
    await expect.poll(() => calls).toBe(10);
    await expect(page.locator("output").first()).toContainText('"summary":null');
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":50');

    await page.getByRole("button", { name: "Join", exact: true }).evaluateAll(buttons => buttons.forEach(button => (button as HTMLButtonElement).click()));
    await expect.poll(() => calls).toBe(11);
    assert.equal(methods.filter(method => method === "POST").length, 1);
    await pending.shift()!();
    await expect.poll(() => calls).toBe(12);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"loading":false');

    await page.evaluate(() => (window as unknown as {setEnabled:(enabled:boolean)=>void}).setEnabled(false));
    await expect(page.locator("output").first()).toContainText('"summary":null');
    await page.evaluate(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("wimifarma:club-updated")); });
    assert.equal(calls, 12);
    await page.evaluate(() => (window as unknown as {setEnabled:(enabled:boolean)=>void}).setEnabled(true));
    await expect.poll(() => calls).toBe(13);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":50');
    await page.evaluate(() => (window as unknown as {changeCount:(count:number)=>void}).changeCount(0));
    await expect(page.locator("output")).toHaveCount(0);
    await page.evaluate(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("wimifarma:club-updated")); });
    assert.equal(calls, 13);

    balance = 777;
    await page.evaluate(() => (window as unknown as {changeCount:(count:number)=>void}).changeCount(4));
    await expect.poll(() => calls).toBe(14);
    sessionIdentity = "bob";
    await page.context().route("**/sender", route => route.fulfill({ contentType: "text/html", body: "Outra aba" }));
    const otherTab = await page.context().newPage();
    await otherTab.goto("http://127.0.0.1:3187/sender");
    await otherTab.evaluate(() => { const channel = new BroadcastChannel("next-auth"); channel.postMessage({ event: "session" }); channel.close(); });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"summary":null');
    await expect.poll(() => page.evaluate(() => (window as unknown as {routerRefreshes:number}).routerRefreshes)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Join", exact: true }).first().click();
    assert.equal(methods.filter(method => method === "POST").length, 1, "adesão fica bloqueada enquanto a identidade diverge");
    balance = 900;
    await page.evaluate(() => (window as unknown as {changeIdentity:(identity:string)=>void}).changeIdentity("bob"));
    await expect.poll(() => calls).toBe(15);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":900');
    await page.getByRole("button", { name: "Join", exact: true }).first().click();
    await expect.poll(() => calls).toBe(16);
    sessionIdentity = "alice";
    await otherTab.evaluate(() => { const channel = new BroadcastChannel("next-auth"); channel.postMessage({ event: "session" }); channel.close(); });
    await expect(page.locator("output").first()).toContainText('"summary":null');
    await pending.shift()!();
    await expect.poll(() => page.evaluate(() => (window as unknown as {routerRefreshes:number}).routerRefreshes)).toBeGreaterThan(1);
    assert.equal(calls, 16, "POST antigo não publica saldo nem dispara GET na nova sessão");
    sessionIdentity = "bob";
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => calls).toBe(17);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":900');

    sessionStatus = 503;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.locator("output").first()).toContainText("Não foi possível verificar sua sessão.");
    await expect(page.locator("output").last()).toContainText('"summary":null');
    sessionStatus = 200;
    await page.getByRole("button", { name: "Retry", exact: true }).first().click();
    await expect.poll(() => calls).toBe(18);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":900');

    await page.getByRole("button", { name: "Retry", exact: true }).first().click();
    await expect.poll(() => calls).toBe(19);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"summary":null');
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    await expect.poll(() => calls).toBe(20);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":900');

    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", {configurable:true,value:"hidden"}); document.dispatchEvent(new Event("visibilitychange")); });
    await expect(page.locator("output").first()).toContainText('"summary":null');
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", {configurable:true,value:"visible"}); document.dispatchEvent(new Event("visibilitychange")); });
    await expect.poll(() => calls).toBe(21);
    await pending.shift()!();
    await expect(page.locator("output").first()).toContainText('"balancePoints":900');
    await otherTab.close();
  } finally { await browser.close(); }
});
