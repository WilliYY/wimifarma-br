import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { Auth } from "@auth/core";
import { encode } from "@auth/core/jwt";

const origin = "http://127.0.0.1:3199";
let browserPromise: ReturnType<typeof chromium.launch> | undefined;
after(async () => { if (browserPromise) await (await browserPromise).close(); });
const cssPath = path.resolve("src/app/globals.css");
const css = fs.readFile(cssPath, "utf8").then(source => postcss([tailwindcss()]).process(source, { from: cssPath })).then(result => result.css);
const mocks: Record<string, string> = {
  "next/link": "import React from 'react';export default ({children,...props})=><a {...props}>{children}</a>;",
  "next/image": "import React from 'react';export default ({fill,unoptimized,priority,fetchPriority,...props})=><img {...props}/>;",
  "next/navigation": "export const redirect=()=>{throw Error('Unexpected fixture redirect')};",
  "next/server": "export const NextResponse={json:()=>{throw Error('Unexpected server response')}};",
  "@/features/auth/auth": "export const auth=async()=>window.session;export const signOut=async options=>{window.logoutCalls.push(options);window.session=null;await window.renderHeader();};",
  "@/components/site/announcement-bar": "export const AnnouncementBar=()=>null;",
  "@/components/site/site-nav": "export const SiteNav=()=>null;",
  "@/components/site/site-search": "export const SiteSearch=()=>null;",
  "@/components/site/cart-header-button": "export const CartHeaderButton=()=>null;",
};
const bundle = build({
  stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {SiteHeader} from './src/components/site/site-header';const root=createRoot(document.getElementById('root'));window.renderHeader=async()=>root.render(await SiteHeader());await window.renderHeader();", resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "logout-fixture", setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: process.cwd() }));
  } }],
});

for (const width of [320, 1536]) {
  for (const identity of [
    { role: "CUSTOMER", customerId: "synthetic-customer" },
    { role: "ADMIN" },
    { role: "MANAGER", customerId: "synthetic-customer" },
    { role: "STAFF", customerId: "synthetic-customer" },
    { role: "STAFF" },
  ]) {
    test(`Sair encerra a ação da conta e remove os controles autenticados: ${width}/${identity.role}/${identity.customerId ? "vinculado" : "interno"}`, async () => {
      const browser = await (browserPromise ??= chromium.launch());
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        const benefitRequests: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        const [styles, script] = await Promise.all([css, bundle]);
        const session = { user: { id: "synthetic", name: "Conta sintética", ...identity } };
        await page.route("**/*", route => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) return route.abort();
          if (url.pathname === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<meta charset="utf-8"><style>${styles}</style><div id="root"></div><main style="height:4000px"></main><script>window.session=${JSON.stringify(session)};window.logoutCalls=[];</script><script type="module" src="/fixture.js"></script>` });
          if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: script.outputFiles[0].text });
          if (url.pathname === "/api/minha-conta/cashback") {
            benefitRequests.push(url.pathname);
            return route.fulfill({ json: { data: { balance: "12.34" } } });
          }
          if (url.pathname === "/api/minha-conta/club") {
            benefitRequests.push(url.pathname);
            return route.fulfill({ json: { data: { member: true, joinedAt: "2026-10-01T12:00:00Z", balancePoints: 12345, pendingPoints: 0, lifetimeEarnedPoints: 12345, lifetimeRedeemedPoints: 0, transactions: [] } } });
          }
          return route.abort();
        });
        await page.clock.install();
        await page.goto(origin);
        await expect(page.locator("header")).toBeVisible().catch(error => { throw new Error(errors.join("; ") || String(error)); });
        const logout = page.getByRole("button", { name: "Sair", exact: true });
        await expect(logout).toHaveCount(1);
        await expect(logout).toBeVisible();
        const box = await logout.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width);
        await expect(logout).toHaveAttribute("type", "submit");
        await expect(page.getByRole("link", { name: "Painel admin", exact: true })).toHaveCount(identity.role === "CUSTOMER" ? 0 : 1);
        if (identity.customerId) {
          await expect(page.locator("[data-header-account-balance]").first()).toContainText("12.345");
          await expect(page.locator("[data-header-account-balance]").first()).toContainText(/12,34/);
        }
        await page.evaluate(() => scrollTo(0, 400));
        await expect(page.locator("header")).toHaveAttribute("data-compact", "true");
        await expect(logout).toBeVisible();
        if (width === 320) await logout.click();
        else { await logout.focus(); await logout.press("Enter"); }
        await expect.poll(() => page.evaluate(() => (window as unknown as { logoutCalls: unknown[] }).logoutCalls)).toEqual([{ redirectTo: "/" }]);
        await expect(page.getByRole("button", { name: "Sair", exact: true })).toHaveCount(0);
        await expect(page.getByRole("link", { name: "Painel admin", exact: true })).toHaveCount(0);
        await expect(page.getByRole("link", { name: "Login ou cadastro", exact: true })).toHaveCount(1);
        await expect(page.locator("header")).not.toContainText(/Conta sintética|12\.345|12,34/);
        const requestsAfterLogout = benefitRequests.length;
        await page.evaluate(() => {
          window.dispatchEvent(new Event("focus"));
          window.dispatchEvent(new Event("wimifarma:club-updated"));
          window.dispatchEvent(new Event("wimifarma:cashback-updated"));
        });
        await page.clock.runFor(61_000);
        assert.equal(benefitRequests.length, requestsAfterLogout, "visitante não mantém consultas por eventos nem polling de 60 segundos da conta anterior");
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });
  }
}

for (const role of ["CUSTOMER", "STAFF"]) {
  test(`Auth.js apaga o cookie da sessão ${role} e exige CSRF no endpoint público`, async () => {
    const base = "https://example.invalid";
    const secret = "synthetic-logout-secret-only-used-by-tests";
    const cookieName = "__Secure-authjs.session-token";
    const token = await encode({ secret, salt: cookieName, token: { sub: "synthetic", id: "synthetic", role } });
    const config = { secret, trustHost: true, basePath: "/api/auth", providers: [], session: { strategy: "jwt" as const } };
    const authenticatedCookie = `${cookieName}=${token}`;
    const before = await Auth(new Request(`${base}/api/auth/session`, { headers: { cookie: authenticatedCookie } }), config);
    assert.ok((await before.json()).user, "a sessão sintética existe antes de sair");
    const withoutCsrf = await Auth(new Request(`${base}/api/auth/signout`, { method: "POST", headers: { cookie: authenticatedCookie, "content-type": "application/x-www-form-urlencoded" }, body: "callbackUrl=%2F" }), { ...config, logger: { error: () => {} } });
    assert.match(withoutCsrf.headers.get("location") ?? "", /MissingCSRF/);
    assert.doesNotMatch(withoutCsrf.headers.get("set-cookie") ?? "", /session-token=;.*Max-Age=0/);
    const csrf = await Auth(new Request(`${base}/api/auth/csrf`), config);
    const csrfToken = (await csrf.json()).csrfToken as string;
    const csrfCookie = csrf.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const response = await Auth(new Request(`${base}/api/auth/signout`, { method: "POST", headers: { cookie: `${authenticatedCookie}; ${csrfCookie}`, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, callbackUrl: "/" }) }), config);
    assert.equal(response.headers.get("location"), `${base}/`);
    assert.ok(response.headers.getSetCookie().some(value => value.startsWith(`${cookieName}=;`) && value.includes("Max-Age=0") && value.includes("HttpOnly") && value.includes("Secure") && value.includes("SameSite=Lax")));
    const after = await Auth(new Request(`${base}/api/auth/session`), config);
    assert.equal(await after.json(), null);
  });
}
