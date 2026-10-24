import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";

const bundle = build({
  entryPoints: ["src/app/admin/dashboard/page.tsx"], bundle: true, write: false,
  platform: "node", format: "cjs", jsx: "automatic", packages: "external",
  plugins: [{ name: "dashboard-page-fixture", setup(builder) {
    builder.onResolve({ filter: /^react$/ }, args => ({ path: args.path, external: true }));
    builder.onResolve({ filter: /^next\/link$|components\/admin\/admin-shell$|features\/auth\/permissions$|features\/analytics\/online-presence$|lib\/prisma$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
      args.path.endsWith("prisma") ? "export const getPrisma=globalThis.fixture.database;"
        : args.path.endsWith("permissions") ? 'export const adminRoutePermissions={"/admin/dashboard":["ADMIN","MANAGER","STAFF"],"/admin/pedidos":["ADMIN","MANAGER","STAFF"]};export const requireAdminPageRoute=globalThis.fixture.guard;'
          : args.path.endsWith("online-presence") ? "export const getOnlineVisitorSummary=globalThis.fixture.online;export const ONLINE_WINDOW_SECONDS=120;export const VISIT_HEARTBEAT_MS=30000;"
            : args.path.endsWith("admin-shell") ? 'import{createElement}from"react";export function AdminShell({children}){return createElement("main",{className:"mx-auto max-w-screen-2xl p-4"},children);}'
              : 'import{createElement}from"react";export default function Link({children,...props}){return createElement("a",props,children);}',
    }));
  } }],
});

async function fixture(role: string | null, databaseUnavailable = false) {
  const calls: string[] = [];
  const loaded = { exports: {} as { default: () => Promise<React.ReactElement> } };
  vm.runInNewContext((await bundle).outputFiles[0].text, {
    module: loaded, exports: loaded.exports, require: createRequire(import.meta.url),
    console: { error: () => { calls.push("query-error"); } },
    fixture: {
      guard: async (route: string) => {
        calls.push(`guard:${route}`);
        if (!role || !["ADMIN", "MANAGER", "STAFF"].includes(role)) throw new Error("forbidden");
        return { role };
      },
      online: async () => ({ online: 7, windowSeconds: 120, measuredAt: "2026-10-24T15:00:00.000Z" }),
      database: () => {
        calls.push("database");
        if (databaseUnavailable) throw new Error("synthetic database unavailable");
        return {
          product: { count: async (args?: unknown) => args ? 9 : 12 },
          offer: { count: async () => 3 },
          customer: { count: async (args?: unknown) => args ? 6 : 8 },
          coupon: { count: async () => 2, aggregate: async () => ({ _sum: { usesCount: 4 } }) },
          whatsAppContact: { count: async () => 5 },
          siteVisit: { count: async (args?: unknown) => args ? 10 : 21 },
          order: { count: async ({ where }: { where: { AND: [{ status?: string }, { customerId: unknown }] } }) => {
            const purchase = where.AND[0].status === "COMPLETED";
            const withoutAccount = where.AND[1].customerId === null;
            return purchase ? withoutAccount ? 2 : 3 : withoutAccount ? 5 : 8;
          } },
        };
      },
    },
  });
  return { render: loaded.exports.default, calls };
}

test("dashboard authorizes before accessing the database", async () => {
  for (const role of [null, "CUSTOMER"]) {
    const f = await fixture(role);
    await assert.rejects(f.render(), /forbidden/);
    assert.deepEqual(f.calls, ["guard:/admin/dashboard"]);
  }
});

test("real dashboard renders honest metrics, account-link counts and no demonstration panels", async () => {
  const f = await fixture("ADMIN");
  const html = renderToStaticMarkup(await f.render());
  assert.equal(f.calls[0], "guard:/admin/dashboard");
  for (const label of ["Campanhas ativas", "Clientes cadastrados", "Contatos via WhatsApp", "Navegadores registrados", "Pedidos registrados", "Compras concluídas e pagas", "Visitantes online agora", "Consulta ao banco"]) {
    assert.ok(html.includes(label), label);
  }
  assert.match(html, /8 com conta vinculada · 5 sem conta vinculada/);
  assert.match(html, /3 com conta vinculada · 2 sem conta vinculada/);
  assert.match(html, /Sem conta vinculada não comprova compra sem login/);
  assert.match(html, /Pagamentos e frete não foram verificados/);
  assert.match(html, /nesta consulta/);
  assert.doesNotMatch(html, /Roadmap modular|Interesse comercial|Exemplo visual|Recharts|TanStack Table|Pedidos via WhatsApp|ao vivo/);
});

test("STAFF retains order summaries and cannot see coupon metrics or creation action", async () => {
  const admin = renderToStaticMarkup(await (await fixture("ADMIN")).render());
  const staff = renderToStaticMarkup(await (await fixture("STAFF")).render());
  assert.match(admin, /Cupons usados/);
  assert.match(admin, /Criar cupom/);
  assert.doesNotMatch(staff, /Cupons usados|Criar cupom|href="\/admin\/cupons"/);
  assert.match(staff, /Pedidos registrados/);
  assert.match(staff, /Compras concluídas e pagas/);
});

test("database failure renders unavailable state instead of fabricated numeric zero", async () => {
  const f = await fixture("ADMIN", true);
  const html = renderToStaticMarkup(await f.render());
  assert.match(html, /Resumo indisponível/);
  assert.match(html, /Atualização indisponível/);
  assert.match(html, /Aguardando consulta/);
  assert.doesNotMatch(html, /Pedidos registrados|Compras concluídas e pagas|Consultas concluídas/);
  assert.doesNotMatch(html, />0<|>0 navegadores/);
  assert.equal(f.calls.filter(call => call === "query-error").length, 2);
});

// Optional visual verification uses the real page, real Tailwind CSS and SSR only.
// Run with DASHBOARD_VISUAL_OUTPUT_DIR set to persist screenshots for inspection.
if (process.env.DASHBOARD_VISUAL_OUTPUT_DIR) {
  test("dashboard fits 320, 390 and 1440 pixel viewports", async () => {
    const { mkdir, readFile, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const { chromium } = await import("@playwright/test");
    const { default: postcss } = await import("postcss");
    const { default: tailwind } = await import("@tailwindcss/postcss");
    const output = path.resolve(process.env.DASHBOARD_VISUAL_OUTPUT_DIR!);
    await mkdir(output, { recursive: true });
    const cssFile = path.resolve("src/app/globals.css");
    const css = (await postcss([tailwind()]).process(await readFile(cssFile, "utf8"), { from: cssFile })).css;
    const html = renderToStaticMarkup(await (await fixture("ADMIN")).render());
    const htmlDocument = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><body>${html}</body></html>`;
    await writeFile(path.join(output, "dashboard-fixture.html"), htmlDocument);
    const browser = await chromium.launch({ headless: true });
    try {
      for (const width of [320, 390, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
        await page.setContent(htmlDocument);
        await page.screenshot({ path: path.join(output, `dashboard-${width}.png`), fullPage: true });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}px`);
        await page.close();
      }
    } finally {
      await browser.close();
    }
  });
}
