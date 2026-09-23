// Actual server header + synthetic sessions. No database, credentials or API writes.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

const bundle = await build({
  stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { SiteHeader } from './src/components/site/site-header';
    import { CartProvider } from './src/components/site/cart-provider';
    export async function render(session) {
      globalThis.headerAuditSession = session;
      return renderToStaticMarkup(<CartProvider>{await SiteHeader()}</CartProvider>);
    }`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic",
  plugins: [{ name: "isolated-session", setup(builder) {
    builder.onResolve({ filter: /^@\/features\/auth\/auth$/ }, () => ({ path: "auth", namespace: "audit" }));
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "audit" }));
    builder.onResolve({ filter: /\.module\.css$/ }, () => ({ path: "css", namespace: "audit" }));
    builder.onLoad({ filter: /.*/, namespace: "audit" }, ({ path: name }) => ({ contents:
      name === "auth" ? "export const auth = async () => globalThis.headerAuditSession; export const signOut = async () => {};" :
      name === "navigation" ? "export const usePathname = () => '/delivery'; export const useRouter = () => ({}); export const redirect = () => { throw new Error('Unexpected redirect'); };" :
      "export default new Proxy({}, { get: (_, name) => String(name) });", loader: "js" }));
  }}],
});
const mod = { exports: {} };
vm.runInNewContext(bundle.outputFiles[0].text, { module: mod, exports: mod.exports, require: createRequire(path.resolve("package.json")), console, process, URL, Buffer, setTimeout, clearTimeout });
const cssFiles = (await fs.readdir(".next/static/css", { recursive: true })).filter(file => file.endsWith(".css"));
const css = (await Promise.all(cssFiles.map(file => fs.readFile(path.join(".next/static/css", file), "utf8")))).join("\n");
const browser = await chromium.launch();
let checks = 0;
const headerHeights = new Map();
try {
  for (const role of [null, "CUSTOMER", "ADMIN", "ADMIN_CUSTOMER", "MANAGER", "STAFF", "UNKNOWN"]) {
    const allowed = ["ADMIN", "ADMIN_CUSTOMER", "MANAGER", "STAFF"].includes(role);
    const session = role ? { user: { id: "audit-user", name: "Conta de teste", role: role === "ADMIN_CUSTOMER" ? "ADMIN" : role, ...(role === "ADMIN_CUSTOMER" ? { customerId: "audit-customer" } : {}) } } : null;
    const html = await mod.exports.render(session);
    for (const width of [320, 360, 390, 640, 768, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      await page.route("**/*", route => route.abort());
      await page.setContent(`<html><head><style>${css}</style></head><body>${html}</body></html>`);
      const shortcut = page.getByRole("link", { name: "Painel admin", exact: true });
      assert.equal(await page.locator('a[href="/admin/dashboard"]').count(), allowed ? 2 : 0, `${role}: server visibility`);
      await expect(shortcut).toHaveCount(allowed ? 1 : 0);
      if (allowed) {
        const visible = shortcut.locator("visible=true");
        await expect(visible).toHaveCount(1);
        await expect(visible).toHaveAttribute("href", "/admin/dashboard");
        await visible.focus();
        await expect(visible).toBeFocused();
      }
      await expect(page.getByRole("button", { name: "Sair", exact: true }).locator("visible=true")).toHaveCount(role ? 1 : 0);
      await expect(page.locator('a[href="/minha-conta"]').locator("visible=true")).toHaveCount(role ? 1 : 0);
      const height = await page.locator("header").evaluate(el => el.getBoundingClientRect().height);
      if (!role) headerHeights.set(width, height);
      assert.equal(height, headerHeights.get(width), `${role}/${width}: header height changed`);
      if (width >= 768) {
        const inputWidth = await page.locator('input[aria-label="Buscar produtos"]').first().evaluate(el => el.getBoundingClientRect().width);
        assert.ok(inputWidth >= 48, `${role}/${width}: search input too narrow (${inputWidth}px)`);
      }
      const layout = await page.locator("header").evaluate(header => {
        const controls = [...header.querySelectorAll("a,button,input")].filter(el => el.getClientRects().length && el.getBoundingClientRect().width);
        return { overflow: document.documentElement.scrollWidth > innerWidth, outside: controls.filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(el => ({ label: el.textContent || el.getAttribute("aria-label"), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })) };
      });
      assert.equal(layout.overflow, false, `${role}/${width}: horizontal overflow`);
      assert.deepEqual(layout.outside, [], `${role}/${width}: controls outside viewport`);
      if (role === "ADMIN_CUSTOMER" && [320, 1440].includes(width)) {
        await fs.mkdir("artifacts/header-qa", { recursive: true });
        await page.screenshot({ path: `artifacts/header-qa/admin-${width}.png` });
      }
      await page.close();
      checks++;
    }
  }
  console.log(`PASS: ${checks} header scenarios; role visibility, focus, account/logout, responsive bounds.`);
} finally { await browser.close(); }
