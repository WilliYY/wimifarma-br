import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";

test("planejamento de fornecedores permite somente ADMIN e bloqueia URL direta antes de renderizar", async () => {
  const result = await build({ entryPoints: ["src/app/admin/fornecedores/page.tsx"], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic", plugins: [{ name: "supplier-access-fixtures", setup(builder) {
      builder.onResolve({ filter: /features\/auth\/auth$|components\/admin\/(?:admin-shell|supplier-planning-panel|cotefacil-ean-panel)$|^next\/navigation$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("auth")
        ? "export const auth=globalThis.fixture.auth;"
        : args.path === "next/navigation" ? "export function redirect(url){throw new Error('REDIRECT:'+url)}"
          : args.path.endsWith("admin-shell") ? "export const AdminShell=()=>null;"
            : args.path.endsWith("cotefacil-ean-panel") ? "export const CotefacilEanPanel=()=>null;"
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

test("catálogo Cotefácil exige ADMIN antes de consultar EANs e nomes de produtos ativos e identidades públicas", async () => {
  const result = await build({
    entryPoints: ["src/app/api/admin/fornecedores/cotefacil/eans/route.ts"],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    packages: "external",
    plugins: [{
      name: "cotefacil-access-fixtures",
      setup(builder) {
        builder.onResolve({ filter: /features\/auth\/auth$|lib\/prisma$|catalog-identities\/public-query$/ }, args => ({
          path: args.path,
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
          contents: args.path.endsWith("auth")
            ? "export const auth = globalThis.fixture.auth;"
            : args.path.endsWith("public-query") ? "export const getPublicCatalogIdentities = globalThis.fixture.getPublicCatalogIdentities;"
              : "export const getPrisma = globalThis.fixture.getPrisma;",
        }));
      },
    }],
  });

  for (const role of [null, "CUSTOMER", "STAFF", "MANAGER", "ADMIN"]) {
    const queries: unknown[] = [];
    let offline = false;
    let identityReads = 0;
    const diagnostics: unknown[][] = [];
    const loaded = { exports: {} as { GET: () => Promise<Response> } };
    vm.runInNewContext(result.outputFiles[0].text, {
      module: loaded,
      exports: loaded.exports,
      require: createRequire(import.meta.url),
      process,
      Buffer,
      console: { error: (...args: unknown[]) => diagnostics.push(args) },
      fixture: {
        auth: async () => role ? { user: { id: "synthetic-user", role } } : null,
        getPublicCatalogIdentities: async () => {
          identityReads++;
          return [
            { ean: "0012345678905", gtinCanonical: "00012345678905", name: "Duplicado" },
            { ean: "7896181915638", gtinCanonical: "07896181915638", name: "Identidade pública" },
          ];
        },
        getPrisma: () => ({
          product: {
            findMany: async (query: unknown) => {
              queries.push(query);
              if (offline) throw new Error("Conexão indisponível");
              return [{ ean: "012345678905", eanNormalized: "00012345678905", name: "Produto público" }];
            },
          },
        }),
      },
    });

    const response = await loaded.exports.GET();
    if (role !== "ADMIN") {
      assert.equal(response.status, 401, String(role));
      assert.equal(queries.length, 0);
      assert.equal(identityReads, 0);
      continue;
    }

    assert.equal(response.status, 200);
    assert.equal(identityReads, 1);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.deepEqual(JSON.parse(JSON.stringify(queries)), [{
      where: { status: "ACTIVE", deletedAt: null },
      select: { ean: true, eanNormalized: true, name: true },
      orderBy: { id: "asc" },
    }]);
    assert.deepEqual(await response.json(), {
      data: {
        eans: ["012345678905", "7896181915638"], duplicates: 1, invalid: 0, missing: 0,
        items: [
          { ean: "012345678905", description: "Produto público" },
          { ean: "7896181915638", description: "Identidade pública" },
        ],
      },
    });

    offline = true;
    const failed = await loaded.exports.GET();
    assert.equal(failed.status, 503);
    assert.deepEqual(diagnostics, [["[cotefacil-eans] CATALOG_READ_FAILED"]]);
    assert.equal(failed.headers.get("Cache-Control"), "private, no-store");
    assert.deepEqual(await failed.json(), { error: "Não foi possível carregar os EANs do catálogo." });
  }
});
