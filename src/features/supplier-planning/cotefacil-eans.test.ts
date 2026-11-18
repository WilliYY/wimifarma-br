import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import { buildCotefacilCsv, collectCatalogEans, parseCotefacilEans } from "./cotefacil-eans";

test("prepara códigos válidos na ordem de entrada, preservando zeros e removendo equivalentes", () => {
  assert.deepEqual(parseCotefacilEans("012345678905, 0012345678905\n7896181915638;7896181915639\tinválido"), {
    eans: ["012345678905", "7896181915638"],
    duplicates: 1,
    invalid: 2,
  });
  assert.deepEqual(parseCotefacilEans(" \n ; , "), { eans: [], duplicates: 0, invalid: 0 });
});

test("prefere a identidade canônica, preserva a grafia original compatível e aceita EAN legado", () => {
  assert.deepEqual(collectCatalogEans([
    { eanNormalized: "00012345678905", ean: "012345678905" },
    { eanNormalized: null, ean: "0012345678905" },
    { eanNormalized: "inválido", ean: "7896181915638" },
    { eanNormalized: "17896181915635", ean: "7896181915638" },
    { eanNormalized: null, ean: "7896181915639" },
    { eanNormalized: null, ean: null },
    { eanNormalized: " ", ean: "" },
  ]), {
    eans: ["012345678905", "17896181915635", "7896181915638"],
    duplicates: 1,
    invalid: 1,
    missing: 2,
    items: [],
  });
});

test("CSV usa cinco campos, vírgulas, CRLF e preserva zeros, aspas e descrição pública", () => {
  const catalog = collectCatalogEans([
    { ean: "012345678905", eanNormalized: null, name: 'Produto, "teste"\nsegunda linha' },
    { ean: "0012345678905", eanNormalized: null, name: "Duplicado" },
  ]);
  assert.deepEqual(catalog.items, [{ ean: "012345678905", description: 'Produto, "teste"\nsegunda linha' }]);
  assert.equal(buildCotefacilCsv(["012345678905", "0012345678905"], catalog.items),
    '"012345678905",1,"012345678905","Produto, ""teste""\nsegunda linha","NAO INFORMADO"\r\n');
});

test("CSV neutraliza fórmulas no texto livre e recusa códigos sem descrição pública", () => {
  for (const description of ["=1+1", "+CMD", "-2", "@SUM(1)", " \t=1", "\uFEFF@SUM(1)"]) {
    assert.equal(buildCotefacilCsv(["012345678905"], [{ ean: "012345678905", description }]),
      `"012345678905",1,"012345678905","'${description}","NAO INFORMADO"\r\n`);
  }
  assert.throws(() => buildCotefacilCsv(["7896181915639"], []), /Revise os EANs/);
  assert.throws(() => buildCotefacilCsv(["012345678905"], []), /sem descrição pública/);
  assert.equal(buildCotefacilCsv([], []), "");
});

test("CSV associa descrições por GTIN equivalente sem converter EAN ou acrescentar BOM", () => {
  const csv = buildCotefacilCsv(["0012345678905", "7896181915638"], [
    { ean: "012345678905", description: "Descrição pública çã" },
    { ean: "7896181915638", description: "Segundo item" },
  ]);
  assert.equal(csv,
    '"0012345678905",1,"0012345678905","Descrição pública çã","NAO INFORMADO"\r\n' +
    '"7896181915638",1,"7896181915638","Segundo item","NAO INFORMADO"\r\n');
  assert.notEqual(Buffer.from(csv, "utf8").subarray(0, 3).toString("hex"), "efbbbf");
  assert.throws(() => buildCotefacilCsv(["012345678905"], [{ ean: "012345678905", description: " \t" }]), /sem descrição pública/);
});

test("painel baixa CSV local após leitura ADMIN, sem transmitir ao Cotefácil", async () => {
  type Element = { type: string; props: Record<string, unknown> };
  const bundled = await build({
    entryPoints: ["src/components/admin/cotefacil-ean-panel.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "cotefacil-download-fixtures", setup(builder) {
      builder.onResolve({ filter: /^react(?:\/jsx-runtime)?$|components\/ui\/(button|textarea)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
        args.path === "react" ? "export const useState=globalThis.fixture.useState;"
          : args.path === "react/jsx-runtime" ? 'export const jsx=globalThis.fixture.jsx; export const jsxs=jsx; export const Fragment="fragment";'
            : args.path.endsWith("button") ? 'export const Button="button";' : 'export const Textarea="textarea";',
      }));
    } }],
  });
  const state: unknown[] = [];
  let cursor = 0;
  const requests: { url: string; options: unknown }[] = [];
  const blobs: Blob[] = [];
  const revoked: string[] = [];
  let clicked = 0;
  const anchor = { href: "", download: "", click: () => { clicked++; } };
  const loaded = { exports: {} as { CotefacilEanPanel: () => Element } };
  vm.runInNewContext(bundled.outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Blob,
    fixture: {
      useState: (initial: unknown) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value: unknown) => { state[index] = value; }];
      },
      jsx: (type: string, props: Element["props"]) => ({ type, props }),
    },
    fetch: async (url: string, options: unknown) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ data: collectCatalogEans([
        { ean: "012345678905", eanNormalized: null, name: "Produto público" },
      ]) }) };
    },
    document: { createElement: (tag: string) => { assert.equal(tag, "a"); return anchor; } },
    URL: {
      createObjectURL: (blob: Blob) => { blobs.push(blob); return "blob:synthetic-csv"; },
      revokeObjectURL: (url: string) => { revoked.push(url); },
    },
    setTimeout: (callback: () => void) => { callback(); },
  });
  const render = () => { cursor = 0; return loaded.exports.CotefacilEanPanel(); };
  const find = (element: Element, label: string): Element | undefined => {
    if (element?.props?.children === label) return element;
    const children = element?.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child && typeof child === "object") {
        const match = find(child as Element, label);
        if (match) return match;
      }
    }
  };
  let panel = render();
  assert.equal(find(panel, "Baixar CSV de EANs")?.props.disabled, true);
  await (find(panel, "Carregar EANs do site")!.props.onClick as () => Promise<void>)();
  panel = render();
  assert.equal(find(panel, "Baixar CSV de EANs")?.props.disabled, false);
  await (find(panel, "Baixar CSV de EANs")!.props.onClick as () => Promise<void>)();
  assert.equal(clicked, 1);
  assert.equal(anchor.download, "cotefacil-consulta.csv");
  assert.equal(blobs[0].type, "text/csv;charset=utf-8");
  assert.equal(await blobs[0].text(), '"012345678905",1,"012345678905","Produto público","NAO INFORMADO"\r\n');
  assert.deepEqual(revoked, ["blob:synthetic-csv"]);
  assert.deepEqual(JSON.parse(JSON.stringify(requests)), [{ url: "/api/admin/fornecedores/cotefacil/eans", options: { cache: "no-store" } }]);
});
