import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

const sceneSource = "/banners/hero-care-people-v3.webp";
const stage = (async () => {
  const bundle = await build({
    entryPoints: ["src/components/site/hero-product-stage.tsx"],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    packages: "external",
    jsx: "automatic",
    plugins: [{ name: "omit-stage-styles", setup(builder) {
      builder.onLoad({ filter: /\.module\.css$/ }, () => ({ contents: "export default {}", loader: "js" }));
    } }],
  });
  const compiled = { exports: {} as { HeroProductStage: (props: { variant: string; compact: boolean; priority?: boolean }) => ReturnType<typeof createElement> } };
  new Function("module", "exports", "require", bundle.outputFiles[0].text)(compiled, compiled.exports, createRequire(resolve("package.json")));
  return compiled.exports.HeroProductStage;
})();

async function markup() {
  const HeroProductStage = await stage;
  return renderToStaticMarkup(createElement("main", null,
    createElement(HeroProductStage, { variant: "care", compact: true, priority: true }),
    createElement(HeroProductStage, { variant: "beauty", compact: true }),
    createElement(HeroProductStage, { variant: "baby", compact: true }),
  ));
}

test("somente a cena inicial recebe fetchpriority high no img e no preload responsivo real do Next", async () => {
  const html = await markup();
  const images = html.match(/<img\b[^>]*>/g) ?? [];
  const preloads = (html.match(/<link\b[^>]*rel="preload"[^>]*>/g) ?? []).filter(link => /hero-care-people-v3|hero-beauty-people-v3|hero-mae-bebe/.test(link));
  assert(images[0]);
  assert.equal(preloads.length, 1);
  assert.match(preloads[0], /fetchPriority="high"/);
  assert.match(preloads[0], /imageSrcSet="[^"]*hero-care-people-v3/);
  assert.match(preloads[0], /imageSizes="\(max-width: 1359px\) 100vw, 1280px"/);
  assert.match(images[0], /fetchPriority="high"/);
  assert.doesNotMatch(images[0], /loading="lazy"/);
  assert.equal(images.filter(image => /fetchPriority="high"/.test(image)).length, 1);
  for (const image of images.filter(image => /hero-beauty-people-v3|hero-mae-bebe/.test(image))) {
    assert.match(image, /loading="lazy"/);
    assert.doesNotMatch(image, /fetchPriority="high"/);
  }
});

test("Chromium descobre a cena inicial pelo preload com prioridade High antes do layout", async () => {
  const html = await markup();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    const requests: { source: string; priority: string }[] = [];
    await client.send("Network.enable");
    client.on("Network.requestWillBeSent", event => {
      if (event.type === "Image") requests.push({ source: event.request.url, priority: event.request.initialPriority });
    });
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${html}` });
      return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' });
    });
    await page.goto("http://127.0.0.1:3197/", { waitUntil: "load" });
    const careRequests = requests.filter(request => request.source.includes(encodeURIComponent(sceneSource)));
    assert.equal(careRequests.length, 1, "preload e img reutilizam a mesma requisição");
    assert.equal(careRequests[0].priority, "High");
    assert.equal(await page.locator('img[fetchpriority="high"]').count(), 1);
    await context.close();
  } finally {
    await browser.close();
  }
});
