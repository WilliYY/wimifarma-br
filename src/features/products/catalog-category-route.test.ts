import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";

test("rota de categoria conserva subcategoria compatível, marca, busca e ordenação sem ampliar o grupo", async () => {
  const compiled = await build({ entryPoints: ["src/app/(site)/categorias/[slug]/page.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic", plugins: [{ name: "category-route-fixture", setup(builder) {
    builder.onResolve({ filter: /components\/site\/catalog-page$|features\/products\/storefront$|lib\/metadata$|^next\/navigation$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents:
      args.path.endsWith("catalog-page") ? "export const CatalogPage=()=>null;"
        : args.path.endsWith("storefront") ? "export const catalogPageNumber=()=>1;export const getPublicCategories=async()=>[{name:'Medicamentos',slug:'medicamentos',names:['Medicamento','Medicamentos']},{name:'Higiene pessoal',slug:'higiene-pessoal',names:['Higiene pessoal']},{name:'Nutrição',slug:'nutricao',names:['Nutrição']}];"
        : args.path.endsWith("metadata") ? "export const createPublicPageMetadata=()=>({});" : "export const notFound=()=>{throw Error('404')};" }));
  } }] });
  const loaded = { exports: {} as { default: (props: unknown) => Promise<{ props: { group?: string; section?: string; path: string; categoryNames: string[]; brand: string; query: string; sort: string } }> } };
  vm.runInNewContext(compiled.outputFiles[0].text, { module: loaded, exports: loaded.exports, require: createRequire(import.meta.url), URL, URLSearchParams, process, console });
  const render = (slug: string, assunto: string) => loaded.exports.default({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({ assunto, marca: "Marca QA", q: "cuidado", ordem: "preco-desc", pagina: "3" }) });
  const medicine = (await render("medicamentos", "diabetes")).props;
  assert.equal(medicine.group, undefined);
  assert.equal(medicine.section, "diabetes");
  assert.deepEqual(Array.from(medicine.categoryNames), ["Medicamento", "Medicamentos"]);
  assert.equal(medicine.path, "/categorias/medicamentos?assunto=diabetes&marca=Marca+QA&q=cuidado&ordem=preco-desc");
  assert.equal(medicine.brand, "Marca QA"); assert.equal(medicine.query, "cuidado"); assert.equal(medicine.sort, "preco-desc");
  assert.equal((await render("higiene-pessoal", "hair")).props.section, "hair");
  assert.equal((await render("higiene-pessoal", "diabetes")).props.section, undefined);
  assert.equal((await render("nutricao", "diabetes")).props.section, undefined);
});
