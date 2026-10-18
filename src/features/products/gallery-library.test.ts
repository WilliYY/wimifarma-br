import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

test("biblioteca impede exclusão de foto usada somente na galeria", async () => {
  let deleted = false;
  let checkedGallery = false;
  const transaction = {
    $queryRaw: async () => [],
    productImage: {
      findUnique: async () => ({ id: "synthetic-image", url: "/uploads/products/back.webp", _count: { products: 0 } }),
      delete: async () => { deleted = true; },
    },
    product: { count: async (args: { where: { OR?: { imageUrls?: { has: string } }[] } }) => {
      checkedGallery = Boolean(args.where.OR?.some(condition => condition.imageUrls?.has === "/uploads/products/back.webp"));
      return checkedGallery ? 1 : 0;
    } },
  };
  const fixture = { db: { $transaction: async (run: (tx: typeof transaction) => unknown) => run(transaction) } };
  const bundle = await build({ entryPoints: ["src/app/api/admin/imagens-produtos/[id]/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "gallery-library-fixture", setup(builder) {
    builder.onResolve({ filter: /features\/auth\/permissions$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("permissions")
      ? "export const requireAdminApi=async()=>({session:{user:{id:'synthetic-admin',role:'ADMIN'}}});"
      : "export const getPrisma=()=>fixture.db;" }));
  } }] });
  const loaded = { exports: {} as { DELETE(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), fixture, console });
  const response = await loaded.exports.DELETE(new Request("https://example.com/api/admin/imagens-produtos/synthetic-image", { method: "DELETE" }), { params: Promise.resolve({ id: "synthetic-image" }) });
  assert.equal(response.status, 409);
  assert.equal(checkedGallery, true);
  assert.equal(deleted, false);
});
