import type { CatalogGroup } from "@/features/products/home-shortcuts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogProductCard } from "./catalog-product-card";
import { CatalogFilterPanel } from "./catalog-filter-panel";
import { CatalogCategoryNavigation } from "./catalog-category-navigation";
import { getPublicCategories, getPublicCatalogSections, getStorefrontProducts, PAGE_SIZE, catalogPageHref } from "@/features/products/storefront";
import { catalogFilterHref, catalogPagination, catalogSections, catalogSorts, type CatalogSort } from "@/features/products/catalog-navigation";
import { productSearchPlan } from "@/features/products/public-search";
import { breadcrumbData, SITE_URL } from "@/lib/seo";
import { serializeProductStructuredData } from "@/features/products/product-detail";

export async function CatalogPage({ title, description, path, page, categoryNames, offers = false, group, sort = "relevantes", brand, section, query }: { title: string; description: string; path: string; page: number; categoryNames?: string[]; offers?: boolean; group?: CatalogGroup; sort?: CatalogSort; brand?: string; section?: string; query?: string }) {
  const [{ products, count }, categories, availableSections] = await Promise.all([
    getStorefrontProducts({ page, categories: categoryNames, offers, group, sort, brand, section, query }), getPublicCategories(), getPublicCatalogSections(),
  ]);
  if (page > 1 && products.length === 0) notFound();
  const selectedSection = catalogSections.find(item => item.id === section);
  const topicSearch = Boolean(selectedSection?.topic || (query && productSearchPlan(query).topics.length));
  const basePath = path.split("?")[0];
  const parameters = [...new URL(path, SITE_URL).searchParams].filter(([key]) => key !== "pagina" && key !== "ordem");
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const crumbs = [{ name: "Início", path: "/" }, { name: "Catálogo", path: "/catalogo" }, ...(basePath !== "/catalogo" || group || section ? [{ name: title, path }] : [])];
  const structured = [breadcrumbData(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: `${SITE_URL}${catalogPageHref(path, page)}`, mainEntity: { "@type": "ItemList", itemListElement: products.map((product, i) => ({ "@type": "ListItem", position: (page - 1) * PAGE_SIZE + i + 1, url: `${SITE_URL}/produto/${encodeURIComponent(product.slug)}`, name: product.name })) } }];
  const linkClass = "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-subtle hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand aria-[current=page]:bg-brand/5 aria-[current=page]:font-bold aria-[current=page]:text-brand";

  return <section className="bg-surface-subtle pb-16 pt-36 sm:pt-40 lg:pt-56">
    <script dangerouslySetInnerHTML={{ __html: serializeProductStructuredData(structured) }} type="application/ld+json" />
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <nav aria-label="Navegação estrutural" className="mb-6 flex flex-wrap gap-2 text-xs text-muted">{crumbs.map((crumb, i) => <span key={`${crumb.path}-${i}`}>{i > 0 && <span aria-hidden="true" className="mr-2">/</span>}<Link className="underline" href={crumb.path}>{crumb.name}</Link></span>)}</nav>
      <header className="border-b border-line pb-6"><h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p></header>
      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
        <CatalogFilterPanel>
          <CatalogCategoryNavigation categories={categories} availableSections={availableSections} path={path} group={group} section={section} offers={offers} categorySelected={Boolean(categoryNames)} />
          <form action={basePath} className="border-t border-line p-4" role="search">
            {parameters.filter(([key]) => key !== "q").map(([key, value]) => <input key={key} name={key} type="hidden" value={value} />)}
            {sort !== "relevantes" ? <input name="ordem" type="hidden" value={sort} /> : null}
            <label className="text-xs font-bold text-ink" htmlFor="catalog-search">Buscar nesta seleção</label>
            <input className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-line px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" defaultValue={query} id="catalog-search" maxLength={80} name="q" placeholder="Nome ou marca" type="search" />
            <button className="mt-2 min-h-11 w-full rounded-lg bg-brand px-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" type="submit">Buscar</button>
          </form>
        </CatalogFilterPanel>
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <p aria-live="polite" className="pb-2 text-sm text-muted"><strong className="font-bold text-ink">{count}</strong> {count === 1 ? "produto" : "produtos"}</p>
            <form action={basePath} className="flex flex-wrap items-end gap-2">
              {parameters.map(([key, value]) => <input key={key} name={key} type="hidden" value={value} />)}
              <div><label className="mb-1 block text-xs font-semibold text-muted" htmlFor="catalog-sort">Ordenar por</label><select className="min-h-11 max-w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" defaultValue={sort} id="catalog-sort" name="ordem">{catalogSorts.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
              <button className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" type="submit">Aplicar</button>
            </form>
          </div>
          {brand || query || section ? <div className="mb-5 flex flex-wrap gap-2 text-xs">{[["marca", brand], ["q", query], ["assunto", selectedSection?.label]].map(([key, value]) => value ? <Link aria-label={`Remover filtro ${value}`} className="inline-flex min-h-11 items-center gap-3 rounded-full border border-line bg-white px-4 font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={catalogFilterHref(path, { [key!]: undefined })} key={key}>{value}<span aria-hidden="true">×</span></Link> : null)}</div> : null}
          {topicSearch ? <p className="mb-5 text-xs leading-6 text-muted">Navegação por assunto. A escolha ou troca de medicamento deve seguir a orientação do profissional de saúde.</p> : null}
          {products.length ? <div className="grid grid-cols-1 items-stretch gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">{products.map(product => <CatalogProductCard key={product.id} product={product} topicSearch={topicSearch} />)}</div> : <div className="rounded-xl border border-line bg-white p-8"><h2 className="font-bold text-ink">Nenhum produto nesta seleção</h2><p className="mt-2 text-sm text-muted">Tente outra categoria ou remova um filtro para explorar o catálogo.</p><Link className="mt-4 inline-flex min-h-11 items-center font-bold text-brand" href="/catalogo">Ver catálogo</Link></div>}
          <nav aria-label="Páginas do catálogo" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
            {page > 1 ? <><Link aria-label="Primeira página" className={linkClass} href={catalogPageHref(path, 1)}>«</Link><Link aria-label="Página anterior" className={linkClass} href={catalogPageHref(path, page - 1)}>‹</Link></> : null}
            {catalogPagination(page, pages).map(item => typeof item === "number" ? <Link aria-current={item === page ? "page" : undefined} aria-label={`Página ${item}`} className={`${linkClass} min-w-11 justify-center border border-line bg-white`} href={catalogPageHref(path, item)} key={item}>{item}</Link> : <span aria-hidden="true" className="px-1 text-muted" key={item}>…</span>)}
            {page < pages ? <><Link aria-label="Próxima página" className={linkClass} href={catalogPageHref(path, page + 1)}>›</Link><Link aria-label="Última página" className={linkClass} href={catalogPageHref(path, pages)}>»</Link></> : null}
          </nav>
          <p className="mt-4 text-center text-xs leading-6 text-muted">Página {page} de {pages} · Preços e disponibilidade sujeitos à confirmação da farmácia.</p>
        </div>
      </div>
    </div>
  </section>;
}
