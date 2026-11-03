import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import type { Metadata } from "next";

async function route(file: string, empty = false) {
  const bundle = await build({ entryPoints: [file], bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", packages: "external", plugins: [{ name: "catalog-route-data", setup(builder) {
    builder.onResolve({ filter: /products\/storefront$|site\/catalog-page$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("catalog-page") ? "export const CatalogPage=()=>null;" : `export const catalogPageNumber=v=>Number(v)||1;export const getPublicCategories=async()=>${empty ? "[]" : "[{slug:'medicamentos',name:'Medicamentos',names:['Medicamentos']},{slug:'infantil',name:'Infantil',names:['Infantil']},{slug:'perfumaria',name:'Perfumaria',names:['Perfumaria']}]"};` }));
  } }] });
  type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };
  const loaded = { exports: {} as { generateMetadata(props: Props): Promise<Metadata>; default(props: Props): Promise<{ props: Record<string, unknown> }> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, URLSearchParams });
  return loaded.exports;
}

test("Medicamentos usa título e canonical de departamento nas duas rotas com filtros e paginação preservados", async () => {
  const filtered = await route("src/app/(site)/catalogo/page.tsx");
  const category = await route("src/app/(site)/categorias/[slug]/page.tsx");
  for (const refinements of [{}, { pagina: "2" }, { marca: "EMS", assunto: "pain", ordem: "preco-asc", pagina: "2" }]) {
    const props = { params: Promise.resolve({ slug: "medicamentos" }), searchParams: Promise.resolve({ ...refinements, grupo: "medicines" }) };
    const a = await filtered.generateMetadata(props);
    const b = await category.generateMetadata(props);
    assert.match(String(a.title), /^Medicamentos em Ivaté-PR/);
    assert.equal(a.title, b.title);
    assert.equal(a.alternates?.canonical, b.alternates?.canonical);
    assert.equal(a.openGraph?.url, a.alternates?.canonical);
    assert.match(String(a.alternates?.canonical), /^\/categorias\/medicamentos(?:\?|$)/);
    if (refinements.pagina) assert.match(String(a.alternates?.canonical), /pagina=2/);
    if (refinements.marca) assert.match(String(a.alternates?.canonical), /marca=EMS/);
    for (const page of [await filtered.default(props), await category.default(props)]) {
      assert.equal(page.props.group, "medicines");
      assert.equal(page.props.categoryNames, undefined, "o departamento usa o mesmo conjunto semântico nas duas rotas");
    }
  }
});

test("categoria Infantil usa o mesmo público do grupo e as demais categorias permanecem exatas", async () => {
  const category = await route("src/app/(site)/categorias/[slug]/page.tsx");
  const baby = await category.default({ params: Promise.resolve({ slug: "infantil" }), searchParams: Promise.resolve({ marca: "Bepantol" }) });
  assert.equal(baby.props.group, "baby");
  assert.equal(baby.props.categoryNames, undefined);
  const beauty = await category.default({ params: Promise.resolve({ slug: "perfumaria" }), searchParams: Promise.resolve({}) });
  assert.equal(beauty.props.group, undefined);
  assert.deepEqual(Array.from(beauty.props.categoryNames as string[]), ["Perfumaria"]);
});

test("departamentos vazios continuam acessíveis sem inventar subcategorias", async () => {
  const category = await route("src/app/(site)/categorias/[slug]/page.tsx", true);
  for (const [slug, group] of [["medicamentos", "medicines"], ["infantil", "baby"]]) {
    const section = group === "medicines" ? "pain" : "baby-care";
    const props = { params: Promise.resolve({ slug }), searchParams: Promise.resolve({ assunto: section }) };
    const page = await category.default(props);
    assert.equal(page.props.group, group);
    assert.equal(page.props.categoryNames, undefined);
    assert.equal(page.props.section, section);
    assert.match(String((await category.generateMetadata(props)).alternates?.canonical), new RegExp(`^/categorias/${slug}`));
  }
  await assert.rejects(() => category.default({ params: Promise.resolve({ slug: "perfumaria" }), searchParams: Promise.resolve({}) }));
});
