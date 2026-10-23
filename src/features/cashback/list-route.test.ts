import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["src/app/api/cashback/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "cashback-list-fixture", setup(builder) {
  builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.includes("permissions") ? "export const requireAdminOnlyApi=fixture.guard;" : "export const getPrisma=()=>fixture.db;" }));
} }] });

test("cashback GET lista 100 por página, ordenação estável, filtros e resposta privada", async () => {
  const calls: { skip: number; take: number; where: unknown; orderBy: unknown }[] = [];
  const counts: unknown[] = [];
  const loaded = { exports: {} as { GET(request: Request): Promise<Response> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), Request, Response, URL, console, fixture: {
    guard: async () => ({}), db: {
      product: { findMany: async (args: typeof calls[number]) => { calls.push(args); return []; }, count: async (args: unknown) => { counts.push(args); return 201; } },
      order: { aggregate: async () => ({ _sum: { cashbackEarnedCents: 0 } }) },
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    },
  } });
  const response = await loaded.exports.GET(new Request("https://store.example/api/cashback?page=2&q=synthetic&enabled=true"));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls[0].skip, 100);
  assert.equal(calls[0].take, 100);
  assert.equal(payload.pages, 3);
  assert.equal(payload.page, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].orderBy)), [{ name: "asc" }, { id: "asc" }]);
  assert.equal((calls[0].where as { cashbackEnabled: boolean }).cashbackEnabled, true);
  assert.match(JSON.stringify(calls[0].where), /synthetic/);
  assert.equal(counts.length, 2);
  assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal((await loaded.exports.GET(new Request("https://store.example/api/cashback?page=1.5"))).status, 422);
});
