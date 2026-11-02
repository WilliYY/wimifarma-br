import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { siteConfig } from "./site";

test("troca e cancelamento têm mensagem contextual no mesmo canal, independente da receita", async () => {
  const bundle = await build({ entryPoints: ["src/app/(site)/informacoes-legais/page.tsx"], bundle: true, write: false, jsx: "automatic", platform: "node", format: "cjs", packages: "external" });
  const loaded = { exports: {} as { default: () => React.ReactNode } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, process });
  const html = renderToStaticMarkup(loaded.exports.default());
  const match = html.match(/href="([^"]+)"[^>]*>Solicitar troca ou cancelamento<\/a>/);
  assert.ok(match);
  const url = new URL(match[1].replaceAll("&amp;", "&"));
  const generic = new URL(siteConfig.whatsappUrl);
  assert.equal(url.origin, generic.origin);
  assert.equal(url.pathname, generic.pathname);
  assert.match(url.searchParams.get("text")!, /troca ou cancelamento/i);
  assert.match(url.searchParams.get("text")!, /número do pedido/i);
  assert.notEqual(url.searchParams.get("text"), generic.searchParams.get("text"));
  assert.ok(html.includes(`href="${siteConfig.whatsappUrl}"`));
});
