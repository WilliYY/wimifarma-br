import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

type Element = { type?: unknown; props: Record<string, unknown> & { children?: unknown } };
function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const element = value as Element;
  return [element, ...elements(element.props.children)];
}

test("cadastro acompanha padrao classificado de 1% e preserva desabilitacao ou percentual ADMIN", async () => {
  const state: unknown[] = [];
  let cursor = 0;
  const fixture = {
    useId: () => "synthetic",
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value: unknown) => { state[index] = value; }];
    },
  };
  const bundle = await build({ entryPoints: ["src/components/admin/cashback-product-fields.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic", plugins: [{ name: "hook-fixture", setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useState=fixture.useState; export const useId=fixture.useId; export const forwardRef=render=>render;" }));
    } }] });
  const loaded = { exports: {} as { CashbackProductFields(props: { enabled: boolean; rateBps: number }): unknown } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture });
  function render(enabled: boolean, rateBps: number) {
    cursor = 0;
    const tree = elements(loaded.exports.CashbackProductFields({ enabled, rateBps }));
    return { checkbox: tree.find(element => element.props.name === "cashbackEnabled")!, percentage: tree.find(element => element.props.name === "cashbackPercent")! };
  }
  assert.equal(render(false, 200).percentage.props.value, "2");
  let fields = render(true, 100);
  assert.equal(fields.checkbox.props.checked, true);
  assert.equal(fields.percentage.props.value, "1");
  (fields.checkbox.props.onChange as (event: unknown) => void)({ target: { checked: false } });
  fields = render(true, 500);
  assert.equal(fields.checkbox.props.checked, false);
  assert.equal(fields.percentage.props.value, "1");
  (fields.percentage.props.onValueChange as (value: string) => void)("1.25");
  fields = render(true, 100);
  assert.equal(fields.checkbox.props.checked, false);
  assert.equal(fields.percentage.props.value, "1.25");
});
