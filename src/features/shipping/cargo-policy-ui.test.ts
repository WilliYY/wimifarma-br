import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

test("catalog measurement edits preserve restrictive cargo flags in an unapproved draft", async () => {
  const profile = { enabled: true, transportReviewed: true, weightGrams: 500, widthCm: 20, heightCm: 20, lengthCm: 20, cargoKinds: ["liquid", "temperature_sensitive"] };
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ProductShippingFields} from './src/components/admin/product-shipping-fields';createRoot(document.getElementById('root')).render(<form><ProductShippingFields initialProfile={${JSON.stringify(profile)}} identityKey='synthetic' researched={false} canEdit={true} medicine={false}/></form>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "fixture-link", setup(builder) {
    builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "import React from 'react';export default function Link(props){return React.createElement('a',props);}", resolveDir: process.cwd() }));
  } }] });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }));
    await page.goto("http://127.0.0.1:3199");
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.getByLabel("Peso embalado (g)", { exact: true }).fill("600");
    const draft = JSON.parse(await page.locator('input[name="shippingDraft"]').inputValue());
    assert.deepEqual(draft.cargoKinds, profile.cargoKinds);
    assert.equal(draft.transportReviewed, false);
    assert.equal(draft.enabled, false);
  } finally { await browser.close(); }
});
