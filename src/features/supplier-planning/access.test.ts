import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";

test("planejamento de fornecedores permite somente ADMIN e bloqueia URL direta antes de renderizar", async () => {
  const result = await build({ entryPoints: ["src/app/admin/fornecedores/page.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic", plugins: [{ name: "supplier-access-fixtures", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|components\/admin\/(?:admin-shell|supplier-planning-panel)$|^next\/navigation$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth")
        ? "export const auth=globalThis.fixture.auth;"
        : args.path === "next/navigation" ? "export function redirect(url){throw new Error('REDIRECT:'+url)}"
          : args.path.endsWith("admin-shell") ? "export const AdminShell=()=>null;"
            : "export const SupplierPlanningPanel=()=>null;" }));
    } }] });
  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER", "ADMIN"]) {
    const loaded = { exports: {} as { default: () => Promise<{ props: { allowedRoles: string[]; title: string } }> } };
    vm.runInNewContext(result.outputFiles[0].text, { module: loaded, exports: loaded.exports,
      require: createRequire(import.meta.url), process, Buffer, console,
      fixture: { auth: async () => role ? { user: { id: "synthetic-user", role } } : null } });
    if (role !== "ADMIN") await assert.rejects(loaded.exports.default(), /REDIRECT:/, String(role));
    else {
      const page = await loaded.exports.default();
      assert.equal(JSON.stringify(page.props.allowedRoles), '["ADMIN"]');
      assert.match(page.props.title, /Fornecedores/);
    }
  }
});
