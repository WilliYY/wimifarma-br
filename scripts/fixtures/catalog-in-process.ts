import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import type { BrowserContext } from "@playwright/test";

const require = createRequire(import.meta.url);
const base = "http://127.0.0.1:3010";

// Exercise built Next route handlers without starting an HTTP listener.
export function inProcessClient() {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/cashback_test");
  Object.assign(globalThis, { AsyncLocalStorage });
  const { NextRequest } = require("next/server");
  const cookies = new Map<string, string>();
  async function request(url: string, options: { method?: string; headers?: Record<string, string>; body?: BodyInit; data?: unknown; form?: Record<string, string> } = {}) {
    const target = new URL(url, base);
    let route = target.pathname;
    let params: Record<string, string | string[]> | undefined;
    if (route.startsWith("/api/auth/")) {
      params = { nextauth: route.slice(10).split("/") }; route = "/api/auth/[...nextauth]";
    } else if (/^\/uploads\/products\//.test(route)) {
      params = { fileName: path.basename(route) }; route = "/api/imagens/produtos/[fileName]";
    } else if (/^\/api\/admin\/imagens-produtos\/.+/.test(route)) {
      params = { id: path.basename(route) }; route = "/api/admin/imagens-produtos/[id]";
    } else if (/^\/api\/produtos\/(?!sugestoes$).+/.test(route)) {
      params = { id: path.basename(route) }; route = "/api/produtos/[id]";
    }
    const headers = new Headers(options.headers);
    headers.set("host", target.host);
    if (cookies.size) headers.set("cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    let body = options.body;
    if (options.data !== undefined) { headers.set("content-type", "application/json"); body = JSON.stringify(options.data); }
    if (options.form) { headers.set("content-type", "application/x-www-form-urlencoded"); body = new URLSearchParams(options.form).toString(); }
    const builtRoute = await require(path.join(process.cwd(), ".next/server/app", route, "route.js"));
    const response: Response = await builtRoute.routeModule.handle(new NextRequest(target, { method: options.method || "GET", headers, body }), {
      params,
      prerenderManifest: { version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: {} },
      renderOpts: { supportsDynamicResponse: true, experimental: {} },
      sharedContext: { buildId: "catalog-isolated-qa" },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0]; const index = pair.indexOf("=");
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return { status: () => response.status, headers: () => Object.fromEntries(response.headers), body: async () => bytes, text: async () => bytes.toString(), json: async () => JSON.parse(bytes.toString()) };
  }
  return {
    request,
    get: (url: string) => request(url),
    post: (url: string, options = {}) => request(url, { ...options, method: "POST" }),
    patch: (url: string, options = {}) => request(url, { ...options, method: "PATCH" }),
    delete: (url: string) => request(url, { method: "DELETE" }),
  };
}

export async function installCatalogFixture(context: BrowserContext, client: ReturnType<typeof inProcessClient>) {
  const bundle = await build({
    entryPoints: ["scripts/fixtures/qa-catalog-page.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  });
  const cssDirectory = path.join(process.cwd(), ".next/static/css");
  const css = (await Promise.all((await readdir(cssDirectory)).filter(file => file.endsWith(".css")).map(file => readFile(path.join(cssDirectory, file), "utf8")))).join("\n");
  await context.route("**/*", async route => {
    const input = route.request(); const url = new URL(input.url());
    if (url.origin !== base) return route.abort();
    if (url.pathname === "/admin/catalogos") return route.fulfill({ contentType: "text/html", body: '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"></head><body><div id="root"></div><script src="/qa.js"></script></body></html>' });
    if (url.pathname === "/qa.js") return route.fulfill({ contentType: "text/javascript", body: Buffer.from(bundle.outputFiles[0].contents) });
    if (url.pathname === "/qa.css") return route.fulfill({ contentType: "text/css", body: css });
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/products/")) {
      const payload = input.postDataBuffer();
      const result = await client.request(input.url(), { method: input.method(), headers: input.headers(), body: payload ? new Uint8Array(payload) : undefined });
      return route.fulfill({ status: result.status(), headers: result.headers(), body: await result.body() });
    }
    return route.fulfill({ status: 404, body: "" });
  });
}
