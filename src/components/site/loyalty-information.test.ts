import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

test("página explica separadamente moedas, cashback de compra e bônus de avaliação", async () => {
  const bundle = await build({ entryPoints: ["src/app/(site)/cashback/page.tsx"], bundle: true, write: false, format: "cjs", platform: "node", packages: "external", jsx: "automatic", plugins: [{ name: "link-fixture", setup(builder) {
    builder.onResolve({ filter: /^next\/link$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "import React from 'react';export default function Link(props){return React.createElement('a',props)}", resolveDir: process.cwd() }));
  } }] });
  const loaded = { exports: {} as { default: () => ReturnType<typeof createElement> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url) });
  const html = renderToStaticMarkup(createElement(loaded.exports.default));
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /WimiCoins/);
  assert.match(text, /100 WimiCoins = R\$ 1/);
  assert.match(text, /Cashback da compra/);
  assert.match(text, /1% nos produtos participantes/);
  assert.match(text, /Bônus de avaliação/);
  assert.match(text, /R\$ 3/);
  assert.match(text, /inscrição automática e gratuita/i);
  assert.match(text, /independentemente da nota/);
  assert.doesNotMatch(text, /pagamento restante continua sujeito a confirmacao humana/i);
});
